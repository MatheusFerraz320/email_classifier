# Email Classifier 
IA para Classificação Inteligente de E-mails

Classificador de e-mails utilizando FastAPI, validações robustas e IA Zero-Shot para determinar automaticamente se um e-mail é produtivo ou improdutivo, retornando também nível de confiança e resposta sugerida.

# Visão Geral
Este projeto foi desenvolvido para demonstrar uma arquitetura backend moderna, combinando:
Regras de validação tradicionais
Inferência por Inteligência Artificial (NLP)
API REST escalável
Boas práticas de código, segurança e deploy
O sistema recebe um texto de e-mail via POST, realiza validações iniciais e, em seguida, utiliza IA Zero-Shot para classificar o conteúdo sem necessidade de treinamento prévio.

# Como funciona a Inteligência Artificial

O classificador utiliza um modelo Zero-Shot NLP, capaz de:
Interpretar o significado do texto
Comparar semanticamente com categorias pré-definidas
Retornar:

- Categoria

- Score de confiança

- Resposta sugerida

Tudo isso sem dataset próprio ou fine-tuning, tornando a solução extremamente flexível.

# Como funciona a API
Validações Inteligentes
Antes de enviar o texto para a IA, o backend aplica regras de validação, como:
- Texto vazio
- Texto muito curto
- Estrutura inválida do payload

Isso reduz chamadas desnecessárias à IA, economiza custo e aumenta a confiabilidade da API.

# Documentação da API (Swagger)

A API conta com documentação interativa automática, gerada pelo FastAPI, facilitando testes e integração.
Após iniciar o servidor, acesse:
http://127.0.0.1:8000/docs
Com o Swagger é possível:

Testar endpoints diretamente no navegador

Visualizar schemas de request e response

Entender validações e tipos de dados

Usar a API sem Postman ou ferramentas externas

# Deploy
Deploy em Produção

O projeto está publicado em produção, com frontend e backend deployados de forma independente, seguindo boas práticas de arquitetura e separação de responsabilidades.

 Frontend (Render)

Aplicação web responsável pela interface e interação com o usuário.

# URL do Frontend

https://email-classifier-r72l.onrender.com

# Backend / API (Render)

API responsável pelas validações, regras de negócio e classificação de e-mails utilizando IA Zero-Shot.

URL da API
https://email-classifierb.onrender.com

