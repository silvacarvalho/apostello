# 🎨 Apostello Frontend

Frontend moderno e intuitivo do Sistema de Gestão de Escalas de Pregação - IASD

## 🚀 Stack Tecnológica

- **Next.js 14** (App Router) - Framework React moderno
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Design system utilitário
- **Lucide React** - Ícones modernos
- **Axios** - Cliente HTTP
- **Zustand** - Gerenciamento de estado
- **React Hook Form + Zod** - Validação de formulários
- **React QR Code** - Geração de QR Codes

## 📦 Instalação

```bash
npm install
```

## 🛠️ Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 📝 Próximos Passos

### Estrutura a ser implementada:

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── registro/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── escalas/
│   │   ├── avaliacoes/
│   │   ├── pregadores/
│   │   └── configuracoes/
│   ├── avaliar/
│   │   └── auto/           # QR Code universal
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                  # Componentes base (shadcn/ui)
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── auth/
│   │   └── LoginForm.tsx
│   └── qrcode/
│       └── QRCodeDisplay.tsx
├── lib/
│   ├── api.ts              # Cliente API Axios
│   ├── auth.ts             # Funções de autenticação
│   ├── utils.ts            # Utilitários
│   └── store.ts            # Zustand store
└── types/
    └── index.ts            # TypeScript types

```

## 🎯 Funcionalidades a Implementar

### 1. Autenticação
- [ ] Página de Login moderna
- [ ] Registro de usuários
- [ ] Recuperação de senha
- [ ] Proteção de rotas

### 2. Dashboard
- [ ] Visão geral de estatísticas
- [ ] Calendário de pregações
- [ ] Notificações
- [ ] QR Code universal

### 3. Avaliações
- [ ] Interface de avaliação com estrelas
- [ ] Detecção automática de pregação
- [ ] Histórico de avaliações
- [ ] Formulário responsivo

### 4. Escalas
- [ ] Visualização de escalas
- [ ] Geração automática
- [ ] Solicitação de trocas
- [ ] Exportação PDF

### 5. Pregadores
- [ ] Perfil de pregador
- [ ] Ranking e scores
- [ ] Histórico de pregações
- [ ] Estatísticas

### 6. Configurações
- [ ] Período de avaliação
- [ ] Modo de QR Code
- [ ] Preferências de usuário
- [ ] Importação em massa

## 🎨 Design System

### Cores Primárias
- **Primary**: Blue (#3B82F6)
- **Secondary**: Purple (#A855F7)
- **Accent**: Green (#10B981)
- **Destructive**: Red (#EF4444)

### Tema
- Suporte para modo claro e escuro
- Design limpo e moderno
- Interface intuitiva
- Responsivo (mobile-first)

## 📱 Responsividade

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔗 Integração Backend

API Base URL: `http://localhost:8000/api/v1`

### Principais Endpoints:
- `POST /auth/login` - Login
- `GET /avaliacoes/detectar-pregacao` - Detecção automática
- `GET /qrcodes/meu-distrito/universal` - QR Code universal
- `POST /avaliacoes/` - Criar avaliação

## 📄 Licença

Projeto desenvolvido para a Igreja Adventista do Sétimo Dia
