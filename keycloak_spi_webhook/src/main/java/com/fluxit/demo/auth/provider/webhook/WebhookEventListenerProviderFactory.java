package com.fluxit.demo.auth.provider.webhook;

import org.keycloak.Config.Scope;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.provider.ProviderConfigurationBuilder;

import java.util.List;
import java.util.Properties;
import org.jboss.logging.Logger;

public class WebhookEventListenerProviderFactory implements EventListenerProviderFactory {

    private String webhookUrl;
    private static final Logger log = Logger.getLogger(WebhookEventListenerProviderFactory.class);
    protected List<ProviderConfigProperty> configMetadata;
    protected Properties properties = new Properties();

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new WebhookEventListenerProvider(session, webhookUrl);
    }

    @Override
    public void init(Scope config) {
        this.webhookUrl = config.get("webhookUrl");
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // No post-initialization actions required
    }

    @Override
    public void close() {
        // No specific action needed on close
    }

    @Override
    public String getId() {
        return "webhook-event-listener";
    }
}