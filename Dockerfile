FROM nginx:alpine

# Copiar o arquivo HTML para o diretório padrão do nginx
COPY index.html /usr/share/nginx/html/

# Copiar configuração customizada do nginx se necessário
COPY nginx.conf /etc/nginx/nginx.conf

# Expor a porta 80
EXPOSE 80

# Comando padrão para iniciar o nginx
CMD ["nginx", "-g", "daemon off;"]