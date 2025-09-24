# Usar imagem oficial do Nginx Alpine
FROM nginx:alpine

# Copiar apenas o arquivo HTML
COPY index.html /usr/share/nginx/html/index.html

# Expor porta 80
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]