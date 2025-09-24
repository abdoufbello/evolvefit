# Usar imagem oficial do Nginx Alpine
FROM nginx:alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar arquivos da aplicação
COPY index.html /usr/share/nginx/html/
COPY config.js /usr/share/nginx/html/

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Remover configuração padrão que pode conflitar
RUN rm -f /etc/nginx/conf.d/default.conf

# Copiar script de healthcheck
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Expor porta 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]