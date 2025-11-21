# Apostello - Sistema Revolucionário de Gestão de Escalas

## 🙏 Sobre o Projeto

O **Apostello** é um sistema completo de gestão de escalas para a Igreja Adventista que revoluciona a forma como pastores e líderes organizam pregações e louvor especial.

### ✨ Principais Recursos

- 🤖 **Geração Automática de Escalas** baseada em score dos pregadores
- 📱 **Notificações via WhatsApp** automáticas para todos os pregadores
- 📊 **Relatórios em PDF** profissionais e personalizados
- 🎯 **Gestão de Temáticas** com sugestões automáticas
- ⚡ **94% de Economia de Tempo** - pastores economizam até 15 horas por mês
- 🚫 **Eliminação de Conflitos** de agendamento automática
- 📱 **API REST** completa para desenvolvimento de apps mobile

### 💡 Impacto

Pastores que antes gastavam **16 horas por mês** criando escalas manualmente com seus líderes agora gastam apenas **1 hora** usando o Apostello - uma economia de **94% do tempo**!

## 🚀 Tecnologias

- **Backend**: Django 5.x + Django REST Framework
- **Banco de Dados**: SQLite (dev) / PostgreSQL (produção)
- **Notificações**: Twilio API para WhatsApp
- **Relatórios**: ReportLab para geração de PDFs
- **Linguagem**: Python 3.12+

## 📋 Requisitos

- Python 3.12 ou superior
- pip (gerenciador de pacotes Python)
- Conta Twilio (para notificações WhatsApp)

## ⚙️ Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/silvacarvalho/apostello.git
cd apostello
```

### 2. Instale as dependências

```bash
pip install -r requirements.txt
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Twilio/WhatsApp
TWILIO_ACCOUNT_SID=seu-account-sid
TWILIO_AUTH_TOKEN=seu-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4. Execute as migrações

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Crie um superusuário

```bash
python manage.py createsuperuser
```

### 6. Inicie o servidor

```bash
python manage.py runserver
```

Acesse: `http://localhost:8000/admin/`

## 📚 Estrutura do Projeto

```
apostello/
├── config/              # Configurações do Django
├── core/                # Modelos principais (Distritos, Igrejas, Membros, Pregadores)
├── schedules/           # Gestão de escalas e geração automática
│   ├── models.py        # Modelos de Schedule, Slot, Conflitos
│   ├── generator.py     # Algoritmo de geração automática
│   ├── reports.py       # Geração de relatórios PDF
│   └── views.py         # API endpoints
├── notifications/       # Sistema de notificações WhatsApp
│   ├── models.py        # Modelos de notificações
│   ├── services.py      # Serviço de envio WhatsApp
│   └── views.py         # API endpoints
├── manage.py
└── requirements.txt
```

## 🔌 API Endpoints

### Distritos
- `GET /api/distritos/` - Lista todos os distritos
- `POST /api/distritos/` - Cria novo distrito
- `GET /api/distritos/{id}/` - Detalhes do distrito
- `GET /api/distritos/{id}/churches/` - Lista igrejas do distrito

### Igrejas
- `GET /api/igrejas/` - Lista todas as igrejas
- `POST /api/igrejas/` - Cria nova igreja
- `GET /api/igrejas/{id}/preachers/` - Lista pregadores da igreja

### Pregadores
- `GET /api/pregadores/` - Lista todos os pregadores
- `POST /api/pregadores/` - Cadastra novo pregador
- `POST /api/pregadores/{id}/update_score/` - Atualiza score do pregador

### Escalas (Principal)
- `GET /api/escalas/` - Lista todas as escalas
- `POST /api/escalas/generate/` - **Gera escala automaticamente**
- `POST /api/escalas/{id}/publish/` - Publica e envia notificações WhatsApp
- `GET /api/escalas/{id}/download_pdf/` - Baixa relatório em PDF
- `GET /api/escalas/{id}/conflicts/` - Lista conflitos da escala

### Temas
- `GET /api/temas/` - Lista todos os temas
- `POST /api/temas/` - Cria novo tema

### Notificações
- `GET /api/notificacoes/` - Lista notificações
- `POST /api/notificacoes/{id}/mark_as_read/` - Marca como lida

## 🎯 Como Usar - Geração Automática

### Exemplo: Gerar Escala Automaticamente

```bash
POST /api/escalas/generate/
{
  "church_id": 1,
  "month": 12,
  "year": 2025,
  "slot_type": "PREACHING"
}
```

**Resposta**: Escala completa gerada com:
- Todos os domingos do mês preenchidos
- Pregadores distribuídos por score
- Temas sugeridos automaticamente
- Conflitos detectados
- Tempo economizado calculado

### Publicar e Notificar

```bash
POST /api/escalas/{id}/publish/
```

Isso irá:
1. Mudar status para "PUBLISHED"
2. Enviar WhatsApp para todos os pregadores
3. Incluir tema sugerido na mensagem

### Baixar PDF

```bash
GET /api/escalas/{id}/download_pdf/
```

Gera PDF profissional com:
- Informações da igreja
- Tabela completa de pregações
- Estatísticas
- Design clean e profissional

## 📊 Modelos de Dados

### Pregador (Preacher)
- `score`: Pontuação para priorização
- `total_sermons`: Total de pregações
- `last_sermon_date`: Data da última pregação
- `is_active`: Se está ativo

### Escala (Schedule)
- `church`: Igreja
- `month` / `year`: Período
- `status`: DRAFT, PUBLISHED, SENT, COMPLETED
- `auto_generated`: Se foi gerado automaticamente

### Slot (ScheduleSlot)
- `date`: Data da pregação
- `preacher`: Pregador designado
- `theme`: Tema sugerido
- `confirmed`: Se foi confirmado

## 🎨 Interface Admin

O sistema inclui interface administrativa completa com:
- Gestão de distritos, igrejas e membros
- Cadastro de pregadores com scores
- Visualização de escalas e slots
- Gestão de temas e categorias
- Monitoramento de notificações

Acesse: `http://localhost:8000/admin/`

## 🔐 Segurança

- Autenticação via Django Auth
- Tokens JWT para API (pode ser implementado)
- Validação de permissões
- Proteção CSRF
- Senhas hasheadas

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 👥 Autores

- **Silva Carvalho** - Desenvolvedor Principal

## 📞 Suporte

Para dúvidas e suporte, entre em contato através dos issues do GitHub.

---

**Apostello** - Revolucionando a gestão de escalas na Igreja Adventista! 🙏✨
