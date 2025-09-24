#!/bin/sh

# Script de verificação de saúde para o container EvolveFit
# Este script é executado pelo Docker healthcheck

# Verificar se o Nginx está respondendo
if wget --no-verbose --tries=1 --spider http://localhost/ > /dev/null 2>&1; then
    echo "EvolveFit está saudável"
    exit 0
else
    echo "EvolveFit não está respondendo"
    exit 1
fi