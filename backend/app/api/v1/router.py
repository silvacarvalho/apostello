"""
Router principal da API v1
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, usuarios, distritos, igrejas, escalas, avaliacoes, notificacoes

api_router = APIRouter()

# Incluir rotas
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(distritos.router, prefix="/distritos", tags=["Distritos"])
api_router.include_router(igrejas.router, prefix="/igrejas", tags=["Igrejas"])
api_router.include_router(escalas.router, prefix="/escalas", tags=["Escalas"])
api_router.include_router(avaliacoes.router, prefix="/avaliacoes", tags=["Avaliações"])
api_router.include_router(notificacoes.router, prefix="/notificacoes", tags=["Notificações"])
