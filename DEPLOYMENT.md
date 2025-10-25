# Guia de Deploy no Easypanel com Buildpacks

## Configuração para Deploy no Easypanel

Este projeto está configurado para deploy no Easypanel usando o construtor Heroku Buildpack `heroku/builder:24`.

### Arquivos de Configuração Criados

1. **Procfile** - Define o comando para iniciar a aplicação
2. **project.toml** - Configura o builder heroku/builder:24
3. **app.json** - Configurações do Heroku/Easypanel
4. **.node-version** - Especifica a versão do Node.js (20.18.0)
5. **.env.example** - Template com todas as variáveis de ambiente necessárias

### Passo a Passo para Deploy no Easypanel

#### 1. Preparar o Repositório

```bash
# Certifique-se de que todos os arquivos estão commitados
git add .
git commit -m "Configuração para deploy no Easypanel"
git push origin main
```

#### 2. Criar Projeto no Easypanel

1. Acesse seu painel Easypanel
2. Clique em **"New"** → **"Create Project"**
3. Dê um nome ao projeto (ex: "unipet-plan")

#### 3. Criar Serviço de Aplicação

1. Dentro do projeto, clique em **"+ Service"**
2. Escolha **"App Service"**
3. Configure o serviço:
   - **Name**: unipet-app
   - **Source**: Git Repository
   - **Repository**: URL do seu repositório Git
   - **Branch**: main (ou sua branch de produção)

#### 4. Configurar Build

O Easypanel detectará automaticamente o Buildpack Node.js devido ao `package.json`. 

Se necessário, você pode forçar o uso do builder específico:
- **Builder**: heroku/builder:24 (já configurado no project.toml)

#### 5. Configurar Variáveis de Ambiente

No painel do Easypanel, vá para a aba **"Environment"** e adicione as seguintes variáveis:

**Obrigatórias:**
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=gerar-uma-chave-segura-aleatoria
```

**Opcionais (se usar):**
```env
# Supabase para armazenamento
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-de-servico

# Gateway de Pagamento Cielo
CIELO_MERCHANT_ID=seu-merchant-id
CIELO_MERCHANT_KEY=sua-merchant-key

# Configuração de Email
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=senha-especifica-do-app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Admin inicial
ADMIN_INITIAL_PASSWORD=senha-inicial-admin
```

#### 6. Configurar Banco de Dados

##### Opção A: Usar PostgreSQL do Easypanel
1. No projeto, clique em **"+ Service"**
2. Escolha **"Database"** → **"PostgreSQL"**
3. Configure o banco:
   - **Name**: unipet-db
   - **Version**: 15 ou superior
4. Copie a connection string e use na variável `DATABASE_URL`

##### Opção B: Usar Banco Externo
Use qualquer serviço PostgreSQL (Supabase, Neon, etc.) e configure a `DATABASE_URL`

#### 7. Configurar Domínio e SSL

1. Na aba **"Domains"** do serviço
2. Clique em **"Add Domain"**
3. Configure:
   - Domínio customizado ou use o subdomínio fornecido
   - Marque **"Enable SSL"** para certificado Let's Encrypt automático
   - Marque o domínio principal com ⭐

#### 8. Deploy

1. Clique no botão **"Deploy"**
2. O Easypanel irá:
   - Clonar o repositório
   - Detectar Node.js via `package.json`
   - Executar `npm install`
   - Executar `npm run heroku-postbuild` (instala dependências do client e faz build)
   - Executar `npm start` para iniciar a aplicação

#### 9. Verificar Deploy

1. Acesse a aba **"Logs"** para acompanhar o processo
2. Após o deploy bem-sucedido:
   - A aplicação estará disponível no domínio configurado
   - Verifique o health check em `/api/health`

### Comandos de Build

O projeto está configurado com os seguintes scripts:

- **heroku-postbuild**: Instala dependências do cliente e faz build completo
- **start**: Inicia o servidor compilado (`node dist/unified-server.js`) em modo produção

### Estrutura de Build

```
1. npm install (dependências do servidor)
2. npm run heroku-postbuild
   ├── npm install --prefix client (dependências do cliente)
   └── npm run build
       ├── npm run build:client (Vite build do React)
       └── npm run build:server (TypeScript compilation)
3. npm start (inicia unified-server.ts)
```

### Troubleshooting

#### Build Falha
- Verifique se `package.json` está na raiz do repositório
- Confirme que a versão do Node.js em `.node-version` é suportada
- Verifique os logs de build no Easypanel

#### Erro de Porta
- Certifique-se de que a aplicação usa `process.env.PORT`
- O Easypanel define automaticamente a porta

#### Banco de Dados
- Execute `npm run db:push` após o primeiro deploy para criar as tabelas
- Use `npm run db:push:force` se precisar forçar alterações

#### Assets Estáticos
- O servidor serve arquivos do diretório `dist/client`
- Verifique se o build do cliente está gerando os arquivos corretamente

### Manutenção

#### Atualizar Aplicação
```bash
git push origin main
# Easypanel detecta mudanças e faz redeploy automático
```

#### Forçar Rebuild
```bash
git commit --allow-empty -m "Force rebuild"
git push origin main
```

#### Ver Logs
- Use a interface do Easypanel, aba **"Logs"**
- Logs em tempo real disponíveis

### Recursos Adicionais

- **Health Check**: `/api/health`
- **Admin Health**: `/admin/health`
- **Métricas**: Disponíveis no painel do Easypanel
- **Backup**: Configure backup automático do PostgreSQL no Easypanel

### Suporte

Para problemas específicos do Easypanel:
- Documentação: https://easypanel.io/docs
- Comunidade: https://discord.gg/easypanel

Para problemas da aplicação:
- Verifique os logs no Easypanel
- Teste localmente com `npm run dev`
- Verifique variáveis de ambiente