package com.fluxit.demo.auth.provider.webhook;

import org.keycloak.Config.Scope;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

import java.io.IOException;
import java.util.List;
import java.util.Properties;

import javax.net.ssl.SSLContext;

import org.apache.hc.client5.http.impl.async.CloseableHttpAsyncClient;
import org.apache.hc.client5.http.impl.async.HttpAsyncClients;
import org.apache.hc.client5.http.impl.nio.PoolingAsyncClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
import org.apache.hc.client5.http.ssl.TrustAllStrategy;
import org.apache.hc.core5.http2.HttpVersionPolicy;
import org.apache.hc.core5.ssl.SSLContextBuilder;
import org.jboss.logging.Logger;

public class WebhookEventListenerProviderFactory implements EventListenerProviderFactory {

    private String webhookUrl;
    private static final Logger log = Logger.getLogger(WebhookEventListenerProviderFactory.class);
    protected List<ProviderConfigProperty> configMetadata;
    protected Properties properties = new Properties();
    private CloseableHttpAsyncClient httpClient;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new WebhookEventListenerProvider(session, webhookUrl, httpClient);
    }

    @Override
    public void init(Scope config) {
        try (java.io.InputStream is = getClass().getClassLoader().getResourceAsStream("webhook.properties")) {
            if (is == null) {
                log.warn("Could not find webhook.properties in classpath");
            } else {
                properties.load(is);
                log.info("Loaded properties from webhook.properties");
                
                // Fetch the webhook URL from properties
                this.webhookUrl = properties.getProperty("config.key.webhookUrl");
                
                // Override the webhook URL if specified in the Keycloak config scope
                String configWebhookUrl = config.get("config.key.webhookUrl");
                if (configWebhookUrl != null && !configWebhookUrl.isEmpty()) {
                    this.webhookUrl = configWebhookUrl;
                }

                log.info("Webhook URL set to: " + this.webhookUrl);

                this.httpClient = HttpAsyncClients.custom()
                .setVersionPolicy(HttpVersionPolicy.FORCE_HTTP_2)
                .build();

                this.httpClient.start();
                log.info("HTTP client started");
            }
        } catch (IOException e) {
            log.error("Failed to load webhook.properties file", e);
        }
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // No post-initialization actions required
    }

    @Override
    public void close() {
        log.info("Closing HTTP client");
        if (httpClient != null) {
            try {
                httpClient.close();
            } catch (IOException e) {
                log.error("Error closing HTTP client", e);
            }
        }
    }

    @Override
    public String getId() {
        return "webhook-event-listener";
    }
}