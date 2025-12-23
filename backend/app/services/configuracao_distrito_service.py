"""
Serviço de Configuração do Distrito
"""
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ForbiddenException
from app.repositories.configuracao_distrito_repository import ConfiguracaoDistritoRepository
from app.repositories.distrito_repository import DistritoRepository
from app.models.usuario import Usuario, TipoUsuario
from app.schemas.configuracao_distrito import (
    ConfiguracaoDistritoUpdate,
    ConfiguracaoDistritoResponse
)


class ConfiguracaoDistritoService:
    """Serviço de Configuração do Distrito"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = ConfiguracaoDistritoRepository(db)
        self.distrito_repository = DistritoRepository(db)

    def validar_permissao_pastor(self, current_user: Usuario, distrito_id: int) -> None:
        """Valida se o usuário tem permissão de Pastor/Líder do distrito"""
        # Administrador pode tudo
        if current_user.tipo == TipoUsuario.ADMIN:
            return
        
        # Verifica se é Pastor ou Líder do distrito
        distrito = self.distrito_repository.get_by_id(distrito_id)
        if not distrito:
            raise NotFoundException("Distrito não encontrado")
        
        if current_user.tipo not in [TipoUsuario.PASTOR_DISTRITAL, TipoUsuario.LIDER_DISTRITAL]:
            raise ForbiddenException("Apenas Pastor ou Líder Distrital podem acessar configurações")
        
        if current_user.distrito_id != distrito_id:
            raise ForbiddenException("Você não tem permissão para alterar configurações deste distrito")

    def get_configuracao(self, distrito_id: int, current_user: Usuario) -> ConfiguracaoDistritoResponse:
        """Busca configuração do distrito (cria com padrões se não existir)"""
        self.validar_permissao_pastor(current_user, distrito_id)
        
        config = self.repository.get_or_create_default(distrito_id)
        return ConfiguracaoDistritoResponse.from_orm(config)

    def update_configuracao(
        self,
        distrito_id: int,
        data: ConfiguracaoDistritoUpdate,
        current_user: Usuario
    ) -> ConfiguracaoDistritoResponse:
        """Atualiza configuração do distrito"""
        self.validar_permissao_pastor(current_user, distrito_id)
        
        # Busca ou cria configuração
        config = self.repository.get_or_create_default(distrito_id)
        
        # Atualiza campos
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)
        
        self.db.commit()
        self.db.refresh(config)
        
        return ConfiguracaoDistritoResponse.from_orm(config)
