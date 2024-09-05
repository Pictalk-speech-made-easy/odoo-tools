package com.fluxit.demo.auth.provider.webhook;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.events.admin.OperationType;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.UserModel;
import org.keycloak.models.UserProvider;

import twitter4j.v1.User;

import org.apache.hc.client5.http.async.methods.SimpleHttpRequest;
import org.apache.hc.client5.http.async.methods.SimpleHttpResponse;
import org.apache.hc.client5.http.async.methods.SimpleRequestBuilder;
import org.apache.hc.client5.http.impl.async.CloseableHttpAsyncClient;
import org.apache.hc.client5.http.impl.async.HttpAsyncClients;
import org.apache.hc.core5.concurrent.FutureCallback;
import org.jboss.logging.Logger;
import org.apache.hc.core5.http.ContentType;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;

public class WebhookEventListenerProvider implements EventListenerProvider {

    private static final Logger log = Logger.getLogger(WebhookEventListenerProvider.class);
    private final KeycloakSession session;
    private final String webhookUrl;
    private final CloseableHttpAsyncClient httpClient;

    public WebhookEventListenerProvider(KeycloakSession session, String webhookUrl, CloseableHttpAsyncClient httpClient) {
        this.session = session;
        this.webhookUrl = webhookUrl;
        this.httpClient = httpClient;
    }

    @Override
    public void onEvent(Event event) {
        UserModel user = getUser(event.getUserId());
        if (event.getType() == EventType.REGISTER) {
            log.info("User registered: " + event.getUserId());
            sendWebhook("REGISTER", user, event.getClientId());
        }

        if (event.getType() == EventType.DELETE_ACCOUNT) {
            log.info("User deleted: " + event.getUserId());
            sendWebhook("DELETE_ACCOUNT", user, event.getClientId());
        }

        if (event.getType() == EventType.LOGIN) {
            log.info("User login: " + event.getUserId());
            sendWebhook("LOGIN", user, event.getClientId());
        }

        if (event.getType() == EventType.LOGOUT) {
            log.info("User logout: " + event.getUserId());
            sendWebhook("LOGOUT", user, event.getClientId());
        }
    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        if (adminEvent.getOperationType() == OperationType.DELETE && adminEvent.getResourceTypeAsString().equals("USER")) {
            log.info("User deleted by admin: " + adminEvent.getResourcePath());
            String userId = adminEvent.getResourcePath().replaceAll("users/", "");
            if (userId == null) {
                log.error("User ID is null");
                return;
            }
            sendWebhook("DELETE", getUser(userId), "admin");
        }

        if (adminEvent.getOperationType() == OperationType.CREATE && adminEvent.getResourceTypeAsString().equals("USER")) {
            log.info("User created by admin: " + adminEvent.getResourcePath());
            String userId = adminEvent.getResourcePath().replaceAll("users/", "");
            if (userId == null) {
                log.error("User ID is null");
                return;
            }
            sendWebhook("CREATE", getUser(userId), "admin");
        }
    }

    private CompletableFuture<Void> sendWebhook(String action, UserModel user, String clientId) {
        
        // Stringify the user object
        
        String json = String.format(
            "{\"action\":\"%s\",\"userId\":\"%s\", \"clientId\":\"%s\", \"email\":\"%s\", \"firstName\":\"%s\", \"lastName\":\"%s\"}",
            action, user.getId(), clientId, user.getEmail(), user.getFirstName(), user.getLastName()
        );
        log.info(json);
        log.info(webhookUrl);
        SimpleHttpRequest request = SimpleRequestBuilder.post(webhookUrl).setBody(json, ContentType.APPLICATION_JSON).build();        

        CompletableFuture<Void> future = new CompletableFuture<>();

        log.info(httpClient.getStatus());
        // Execute the request asynchronously
        httpClient.execute(request, new FutureCallback<SimpleHttpResponse>() {
            @Override
            public void completed(SimpleHttpResponse response) {
                // Handle the response on success
                log.info("Webhook sent successfully with status: " + response.getCode());
                future.complete(null);
            }

            @Override
            public void failed(Exception ex) {
                // Handle failure case
                log.error("Failed to send webhook: " + ex.getMessage(), ex);
                future.completeExceptionally(ex);
            }

            @Override
            public void cancelled() {
                // Handle cancellation
                log.warn("Webhook request was cancelled");
                future.completeExceptionally(new RuntimeException("Webhook request was cancelled")); // Complete the future exceptionally on cancellation
            }
        });

        return future;
    }

    private UserModel getUser(String userId) {
        if (userId == null) {
            log.error("User ID is null");
            return null;
        }
        UserProvider userProvider = session.users();
        UserModel user = userProvider.getUserById(session.getContext().getRealm(), userId);
        return user != null ? user : null;
    }

    @Override
    public void close() {
    }
}