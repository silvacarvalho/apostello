"""
Service: Configurações de Negócio
Helpers para leitura de configurações por escopo (usuário/igreja/distrito/associação).
"""

from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.models.configuracao import Configuracao


def _first_config(
    db: Session,
    chave: str,
    *,
    usuario_id: Optional[str] = None,
    igreja_id: Optional[str] = None,
    distrito_id: Optional[str] = None,
    associacao_id: Optional[str] = None,
) -> Optional[Configuracao]:
    """Retorna a primeira configuração encontrada obedecendo a precedência:
    Usuário > Igreja > Distrito > Associação.
    """

    if usuario_id:
        cfg = (
            db.query(Configuracao)
            .filter(Configuracao.chave == chave, Configuracao.usuario_id == usuario_id)
            .first()
        )
        if cfg:
            return cfg

    if igreja_id:
        cfg = (
            db.query(Configuracao)
            .filter(Configuracao.chave == chave, Configuracao.igreja_id == igreja_id)
            .first()
        )
        if cfg:
            return cfg

    if distrito_id:
        cfg = (
            db.query(Configuracao)
            .filter(Configuracao.chave == chave, Configuracao.distrito_id == distrito_id)
            .first()
        )
        if cfg:
            return cfg

    if associacao_id:
        cfg = (
            db.query(Configuracao)
            .filter(Configuracao.chave == chave, Configuracao.associacao_id == associacao_id)
            .first()
        )
        if cfg:
            return cfg

    return None


def get_config_value(
    db: Session,
    chave: str,
    *,
    usuario_id: Optional[str] = None,
    igreja_id: Optional[str] = None,
    distrito_id: Optional[str] = None,
    associacao_id: Optional[str] = None,
    default: Any = None,
) -> Any:
    """Obtém o valor (`valor`) da configuração JSONB respeitando a precedência.
    Retorna `default` quando não encontrada.
    """
    cfg = _first_config(
        db,
        chave,
        usuario_id=usuario_id,
        igreja_id=igreja_id,
        distrito_id=distrito_id,
        associacao_id=associacao_id,
    )
    return cfg.valor if cfg else default


def get_district_config_value(db: Session, distrito_id: str, chave: str, default: Any = None) -> Any:
    """Atalho para buscar configuração diretamente no escopo de distrito."""
    return get_config_value(db, chave, distrito_id=distrito_id, default=default)


def get_score_weights(db: Session, distrito_id: str) -> Dict[str, float]:
    """Recupera pesos para composição do score efetivo de pregadores."""
    valor = get_district_config_value(
        db,
        distrito_id,
        "escala.pesos_score",
        default={"avaliacoes": 0.6, "frequencia": 0.25, "pontualidade": 0.15},
    )

    # Sanitizar e garantir chaves necessárias
    try:
        w_av = float(valor.get("avaliacoes", 0.6))
        w_fr = float(valor.get("frequencia", 0.25))
        w_pt = float(valor.get("pontualidade", 0.15))
    except Exception:
        w_av, w_fr, w_pt = 0.6, 0.25, 0.15

    # Normalizar opcionalmente (somatório ≈ 1)
    total = w_av + w_fr + w_pt
    if total > 0:
        w_av, w_fr, w_pt = w_av / total, w_fr / total, w_pt / total

    return {"avaliacoes": w_av, "frequencia": w_fr, "pontualidade": w_pt}


def get_max_pregacoes_mes_default(db: Session, distrito_id: str) -> int:
    """Limite mensal padrão por distrito, caso o perfil do pregador não defina explicitamente."""
    valor = get_district_config_value(db, distrito_id, "escala.max_pregacoes_mes_default", default=4)
    try:
        return int(valor)
    except Exception:
        # Caso esteja salvo como JSONB com alguma estrutura, tentar acessar campo comum
        if isinstance(valor, dict) and "valor" in valor:
            try:
                return int(valor["valor"])  # type: ignore[index]
            except Exception:
                pass
    return 4


def get_limite_forcado_extra_max(db: Session, distrito_id: str) -> int:
    """Aumento máximo permitido do limite mensal no preenchimento forçado.
    Controla quantas unidades acima do limite mensal padrão podem ser usadas para fechar lacunas.
    """
    valor = get_district_config_value(db, distrito_id, "escala.limite_forcado_extra_max", default=5)
    try:
        v = int(valor)
        return max(0, v)
    except Exception:
        if isinstance(valor, dict) and "valor" in valor:
            try:
                v = int(valor["valor"])  # type: ignore[index]
                return max(0, v)
            except Exception:
                pass
    return 5
