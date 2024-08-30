package com.fluxit.demo.auth.provider.webhook;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.events.admin.OperationType;
import org.keycloak.models.KeycloakSession;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.http.ContentType;

import java.io.IOException;

public class WebhookEventListenerProvider implements EventListenerProvider {

    private final KeycloakSession session;
    private final String webhookUrl;

    public WebhookEventListenerProvider(KeycloakSession session, String webhookUrl) {
        this.session = session;
        this.webhookUrl = webhookUrl;
    }

    @Override
    public void onEvent(Event event) {
        if (event.getType() == EventType.REGISTER) {
            sendWebhook("REGISTER", event.getUserId());
        }

        if (event.getType() == EventType.DELETE_ACCOUNT) {
            sendWebhook("DELETE_ACCOUNT", event.getUserId());
        }
    }

    @Override
    public void onEvent(AdminEvent adminEvent, boolean includeRepresentation) {
        if (adminEvent.getOperationType() == OperationType.DELETE && adminEvent.getResourceTypeAsString().equals("USER")) {
            sendWebhook("DELETE", adminEvent.getResourcePath().replaceAll("users/", ""));
        }
    }
    

    private void sendWebhook(String action, String userId) {
        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpPost request = new HttpPost(webhookUrl);

            String json = String.format(
                "{\"action\":\"%s\",\"userId\":\"%s\"}",
                action, userId
            );

            StringEntity entity = new StringEntity(json, ContentType.APPLICATION_JSON);
            request.setEntity(entity);

            try (CloseableHttpResponse response = httpClient.execute(request)) {
                // Log response or handle it if necessary
            }
        } catch (IOException e) {
            e.printStackTrace();  // You can improve error handling based on your needs
        }
    }

    @Override
    public void close() {
        // No specific action needed on close
    }
}