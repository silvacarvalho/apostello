"""
Router principal da API v1
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, usuarios, distritos, igrejas, escalas, 
    avaliacoes, notificacoes, dashboard, configuracoes, horarios, perfil,
    indisponibilidades, bloqueios, admin, relatorios
)

api_router = APIRouter()

# Incluir rotas
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(perfil.router, prefix="/perfil", tags=["Perfil"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(distritos.router, prefix="/distritos", tags=["Distritos"])
api_router.include_router(igrejas.router, prefix="/igrejas", tags=["Igrejas"])
api_router.include_router(escalas.router, prefix="/escalas", tags=["Escalas"])
api_router.include_router(avaliacoes.router, prefix="/avaliacoes", tags=["Avaliações"])
api_router.include_router(notificacoes.router, prefix="/notificacoes", tags=["Notificações"])
api_router.include_router(configuracoes.router, tags=["Configurações"])
api_router.include_router(horarios.router, tags=["Horários de Culto"])
api_router.include_router(indisponibilidades.router, prefix="/indisponibilidades", tags=["Indisponibilidades"])
api_router.include_router(bloqueios.router, prefix="/bloqueios", tags=["Bloqueios Temporários"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administração"])
api_router.include_router(relatorios.router, prefix="/relatorios", tags=["Relatórios"])
