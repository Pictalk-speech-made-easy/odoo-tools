import { ForbiddenException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import axios from 'axios';
import { SubscriptionDto } from "./subscription.dto";
import { SharedCacheService } from "./shared.cache.service";

@Injectable()
export class SubscriptionOdooService {
    constructor(private sharedCacheService: SharedCacheService) {}
    private readonly odooUrl = process.env.ODOO_URL;
    private readonly odooDb = process.env.ODOO_DB;
    private readonly odooUsername = process.env.ODOO_USER;
    private readonly odooPassword = process.env.ODOO_API;

    private readonly logger = new Logger(SubscriptionOdooService.name);

    /**
     * Authenticate with Odoo and get the user ID (uid)
     */
    private async authenticate(): Promise<number> {
        try {
        const response = await axios.post(`${this.odooUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
            service: 'common',
            method: 'authenticate',
            args: [this.odooDb, this.odooUsername, this.odooPassword, {}],
            },
            id: new Date().getTime(),
        });
        const uid = response.data.result;
        if (!uid) {
            throw new Error('Failed to authenticate with Odoo');
        }
        return uid;
        } catch (error) {
        this.logger.error('Authentication failed', error.message);
        throw error;
        }
    }

    private async findOrCreatePartner(uid: number, email: string): Promise<number> {
        // Search for the partner by email
        const searchResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'res.partner',
              'search_read',
              [[['email', '=', email]]],
              { fields: ['id'] },
            ],
          },
          id: new Date().getTime(),
        });
      
        const partners = searchResponse.data.result;
        if (partners && partners.length > 0) {
          return partners[0].id;
        } else {
          // Create a new partner
          const createResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                this.odooDb,
                uid,
                this.odooPassword,
                'res.partner',
                'create',
                [{
                  email: email,
                }],
              ],
            },
            id: new Date().getTime(),
          });
      
          return createResponse.data.result;
        }
      }
    
      private async getProductId(uid: number, productName: string): Promise<number> {
        const searchResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'product.product',
              'search_read',
              [[['name', '=', productName]]],
              { fields: ['id'] },
            ],
          },
          id: new Date().getTime(),
        });
      
        const products = searchResponse.data.result;
        if (products && products.length > 0) {
          return products[0].id;
        } else {
          throw new Error(`Product "${productName}" not found in Odoo.`);
        }
      }
    
      private async createSaleOrder(uid: number, partnerId: number, productId: number, discount?: number, expiry?: Date): Promise<number> {
        const existingOrdersResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'sale.order',
              'search_read',
              [
                [
                  ['partner_id', '=', partnerId],
                  ['is_subscription', '=', true],
                  // Possibly look for the same product or same plan
                  // or check if there's an unconfirmed or in "draft" status order
                ],
              ],
              { fields: ['id', 'state'] },
            ],
          },
          id: new Date().getTime(),
        });
        
        const existingOrders = existingOrdersResponse.data.result;
        if (existingOrders && existingOrders.length > 0) {
          throw new ForbiddenException(`User already has an active subscription.`);
        }
        
        // Step 1: Retrieve product variant details
        const productDataResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
            service: 'object',
            method: 'execute_kw',
            args: [
                this.odooDb,
                uid,
                this.odooPassword,
                'product.product',
                'read',
                [productId],
                { fields: ['id', 'name', 'product_tmpl_id', 'uom_id', 'uom_po_id'] },
            ],
            },
            id: new Date().getTime(),
        });
        
        console.log(productDataResponse.data);
        const productData = productDataResponse.data.result[0];
        const productTemplateId = productData.product_tmpl_id[0];
        
        // Step 2: Retrieve product template details to get subscription pricing IDs
        const productTemplateDataResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
            service: 'object',
            method: 'execute_kw',
            args: [
                this.odooDb,
                uid,
                this.odooPassword,
                'product.template',
                'read',
                [productTemplateId],
                { fields: ['product_subscription_pricing_ids'] },
            ],
            },
            id: new Date().getTime(),
        });
        
        console.log(productTemplateDataResponse.data);
        const productTemplateData = productTemplateDataResponse.data.result[0];
        const subscriptionPricingIds = productTemplateData.product_subscription_pricing_ids;
        
        if (!subscriptionPricingIds || subscriptionPricingIds.length === 0) {
            throw new Error(`Product "${productData.name}" does not have subscription pricing assigned.`);
        }

        // Step 3: Retrieve the subscription pricing rule
        const subscriptionPricingDataResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
            service: 'object',
            method: 'execute_kw',
            args: [
                this.odooDb,
                uid,
                this.odooPassword,
                'product.pricelist',
                'read',
                [subscriptionPricingIds[0]], // Use the first pricing rule for simplicity
                { fields: ['id'] },
            ],
            },
            id: new Date().getTime(),
        });
        
        console.log(subscriptionPricingDataResponse.data);
        const subscriptionPricingData = subscriptionPricingDataResponse.data.result[0];
        const subscriptionTemplateId = subscriptionPricingData.id;
        
        if (!subscriptionTemplateId) {
            throw new Error(`Subscription pricing does not have a subscription template assigned.`);
        }

        // Prepare the order line with subscription details
        const orderLine = {
            product_id: productId,
            product_uom_qty: 1,
            name: productData.name,
            product_uom: productData.uom_id[0],
        };

        if (discount && discount >= 0 && discount <= 100) {
            orderLine['discount'] = discount;
        }
        
        // Create the sale order with subscription fields
        const createResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
            jsonrpc: '2.0',
            method: 'call',
            params: {
            service: 'object',
            method: 'execute_kw',
            args: [
                this.odooDb,
                uid,
                this.odooPassword,
                'sale.order',
                'create',
                [{
                partner_id: partnerId,
                date_order: formatDateTime(new Date()),
                is_subscription: true,
                plan_id: 1,
                end_date: expiry ? formatDate(expiry) : false,
                order_line: [[0, 0, orderLine]],
                }],
            ],
            },
            id: new Date().getTime(),
        });
        
        console.log(createResponse.data);
        if (!createResponse.data.result) {
            console.log(createResponse.data.error);
            throw new Error(`Failed to create sale order in Odoo: ${createResponse.data.error.data.message}`);
        }
        
        return createResponse.data.result;
      }
    
      async checkUserSubscription(email: string): Promise<SubscriptionDto> {
        try {
          this.logger.log(`Checking subscription for user: ${email}`);
          const uid = await this.authenticate();
      
          // Step 1: Find the partner
          const partnerId = await this.getPartnerIdByEmail(uid, email);
          if (!partnerId) {
            this.logger.log(`No partner found with email: ${email}`);
            return {
                tier: 'basic',
              };
          }
      
          // Step 2: Check active subscriptions
          const subscriptionLevel = await this.getSubscriptionLevel(uid, partnerId);
          this.logger.log(`User ${email} has a ${subscriptionLevel} subscription.`);
          return subscriptionLevel;
        } catch (error) {
          this.logger.error('Error checking user subscription', error.message);
          throw error;
        }
      }
    
      async createAgendaPlusSubscription(email: string, discount?: number, expiry?: Date): Promise<void> {
        try {
          this.logger.log(`Creating Agenda Plus subscription for: ${email}`);
          const uid = await this.authenticate();
      
          // Step 1: Find or create the partner
          const partnerId = await this.findOrCreatePartner(uid, email);
      
          // Step 2: Find the product "Agenda Plus"
          const productId = await this.getProductId(uid, 'Agenda Plus');
      
          // Step 3: Create the sale order with a 100% discount
          const orderId = await this.createSaleOrder(uid, partnerId, productId, discount, expiry);
      
          // Step 4: Confirm the sale order
          await this.confirmSaleOrder(uid, orderId);
          await this.sharedCacheService.set(email, {tier : 'plus', startDate: new Date().toISOString(), nextInvoiceDate: new Date().toISOString()});
          this.logger.log(`Successfully created Agenda Plus subscription for: ${email}`);
        } catch (error) {
          this.logger.error('Error creating Agenda Plus subscription', error.message);
          throw error;
        }
      }
    
      private async getPartnerIdByEmail(uid: number, email: string): Promise<number | null> {
        const searchResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'res.partner',
              'search_read',
              [[['email', '=', email]]],
              { fields: ['id'] },
            ],
          },
          id: new Date().getTime(),
        });
      
        const partners = searchResponse.data.result;
        if (partners && partners.length > 0) {
          return partners[0].id;
        } else {
          return null;
        }
      }
        /**
   * Retrieve prices for Agenda Free and Agenda Plus
   */
  async getAgendaProductPrices(): Promise<{ free: any; plus: any, pro: any }> {
    try {
      
      // Authenticate to get the user ID
      const uid = await this.authenticate();
      
      // Get prices for "Agenda Free" and "Agenda Plus"
      const agendaFreePrice = await this.getProductPrice(uid, 'Agenda basic (free)');
      const agendaPlusPrice = await this.getProductPrice(uid, 'Agenda Plus');
      const agendaProPrice = await this.getProductPrice(uid, 'Agenda Pro');
      
      this.logger.log(`Retrieved prices - Agenda Free: ${agendaFreePrice}, Agenda Plus: ${agendaPlusPrice}`);
      
      return {
        free: agendaFreePrice,
        plus: agendaPlusPrice,
        pro: agendaProPrice,
      };
    } catch (error) {
      this.logger.error('Error retrieving product prices', error.message);
      throw error;
    }
  }
        /**
   * Get the price of a specified product by name
   */
  private async getProductPrice(uid: number, productName: string): Promise<{"unique": number, "month": number, "year": number}[]> {
    try {
      // Search for the product by name
      const productSearchResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            this.odooDb,
            uid,
            this.odooPassword,
            'product.product',
            'search_read',
            [[['name', '=', productName]]],
            { fields: ['list_price', 'product_subscription_pricing_ids'] },
          ],
        },
        id: new Date().getTime(),
      });
      
      const products = productSearchResponse.data.result;
      if (products && products.length > 0) {
        console.log(products);
          let prices = [];
          for (const price of products[0]?.product_subscription_pricing_ids) {
            console.log("price",price);
            const subscriptionPricingDataResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
              jsonrpc: '2.0',
              method: 'call',
              params: {
              service: 'object',
              method: 'execute_kw',
              args: [
                  this.odooDb,
                  uid,
                  this.odooPassword,
                  'sale.subscription.pricing',
                  'read',
                  [price], // Use the first pricing rule for simplicity
                  { fields: ['id', 'plan_id', 'price'] },
              ],
              },
              id: new Date().getTime(),
            });
            console.log("subscriptionPricingDataResponse", JSON.stringify(subscriptionPricingDataResponse.data));
            if (!subscriptionPricingDataResponse.data.result) {
              console.log(subscriptionPricingDataResponse.data.error);
              throw new Error(`Failed to create sale order in Odoo: ${subscriptionPricingDataResponse.data.error.data.message}`);
            }
            const pricesData = subscriptionPricingDataResponse.data.result;
            for (const priceData of pricesData) {
              console.log(priceData.plan_id);
              if (priceData.plan_id.includes(1)) {
                const priceWithFlatTax = Math.round((priceData.price * 1.2 + Number.EPSILON) * 100) / 100;
                prices.push({"month": priceWithFlatTax});
              }
              
              if (priceData.plan_id.includes(2)) {
                const priceWithFlatTax = Math.round((priceData.price * 1.2 + Number.EPSILON) * 100) / 100;
                prices.push({"year": priceWithFlatTax});
              }
            }
          }
          prices.push({"unique": Math.round(products[0].list_price * 1.2)});
        return Object.assign({}, ...prices);
          } else {
            throw new Error(`Product "${productName}" not found in Odoo.`);
          }
        } catch (error) {
          this.logger.error(`Failed to retrieve price for product "${productName}":`, error.message);
          throw error;
        }
      }

      private async getSubscriptionLevel(uid: number, partnerId: number): Promise<SubscriptionDto> {
        // Search for active subscriptions
        const searchResponse = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'sale.order',
              'search_read',
              [[
                ['partner_id', '=', partnerId],
                ['subscription_state', '=', '3_progress'], // 'progress' category typically means active
              ]],
              { fields: ['id', 'order_line', 'start_date', 'next_invoice_date'] },
            ],
          },
          id: new Date().getTime(),
        });
        
        console.log(searchResponse.data);
        const subscriptions = searchResponse.data.result;
        
        if (subscriptions && subscriptions.length > 0) {
          // Loop through subscriptions to check product names
          for (const subscription of subscriptions) {
            const lineIds = subscription.order_line;
            if (lineIds && lineIds.length > 0) {
              const lines = await axios.post(`${this.odooUrl}/jsonrpc`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  service: 'object',
                  method: 'execute_kw',
                  args: [
                    this.odooDb,
                    uid,
                    this.odooPassword,
                    'sale.order.line',
                    'read',
                    [lineIds],
                    { fields: ['product_id'] },
                  ],
                },
                id: new Date().getTime(),
              });
              console.log(lines.data);
              for (const line of lines.data.result) {
                const product = await axios.post(`${this.odooUrl}/jsonrpc`, {
                  jsonrpc: '2.0',
                  method: 'call',
                  params: {
                    service: 'object',
                    method: 'execute_kw',
                    args: [
                      this.odooDb,
                      uid,
                      this.odooPassword,
                      'product.product',
                      'read',
                      [line.product_id[0]],
                      { fields: ['name', 'list_price'] },
                    ],
                  },
                  id: new Date().getTime(),
                });
                console.log(product.data);
      
                const productName = product.data.result[0].name;
                const productPrice = product.data.result[0].list_price;
                
                console.log(subscription)
                if (productName === 'Agenda Plus') {
                  return {
                    tier: 'plus',
                    startDate: subscription.start_date,
                    nextInvoiceDate: subscription.next_invoice_date,
                  };
                } else if (productName === 'Agenda Free' || productPrice === 0) {
                  return {
                    tier: 'basic',
                    startDate: subscription.start_date,
                    nextInvoiceDate: subscription.next_invoice_date,
                  };
                } else if (productName === 'Agenda Pro') {
                  return {
                    tier: 'pro',
                    startDate: subscription.start_date,
                    nextInvoiceDate: subscription.next_invoice_date,
                  };
                }
              }
            }
          }
        }
        return {
            tier: 'basic',
          };
      }
    
      private async confirmSaleOrder(uid: number, orderId: number): Promise<void> {
        const salesOrder = await axios.post(`${this.odooUrl}/jsonrpc`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'object',
            method: 'execute_kw',
            args: [
              this.odooDb,
              uid,
              this.odooPassword,
              'sale.order',
              'action_confirm',
              [orderId],
            ],
          },
          id: new Date().getTime(),
        });
        console.log(salesOrder.data);
      }
}

function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JS
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JS
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}