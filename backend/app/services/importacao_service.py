"""
Service para processamento de importações em massa
"""
import os
import pandas as pd
from typing import List, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid

from app.models.log_importacao import LogImportacao
from app.models.usuario import Usuario, PerfilUsuario
from app.models.tematica import Tematica, TipoRecorrencia, DiaSemana
from app.models.igreja import Igreja
from app.schemas.importacao import (
    ErroLinha,
    TipoImportacao,
    StatusImportacao,
    MembroImportacao,
    TematicaImportacao
)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ImportacaoService:
    """Service para processar importações"""

    def __init__(self, db: Session, usuario_id: str):
        self.db = db
        self.usuario_id = usuario_id

    def ler_arquivo(self, arquivo_path: str) -> pd.DataFrame:
        """Lê arquivo Excel ou CSV e retorna DataFrame"""
        extensao = os.path.splitext(arquivo_path)[1].lower()

        if extensao in ['.xlsx', '.xls']:
            df = pd.read_excel(arquivo_path)
        elif extensao == '.csv':
            # Tenta diferentes encodings
            try:
                df = pd.read_csv(arquivo_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(arquivo_path, encoding='latin-1')
        else:
            raise ValueError(f"Formato de arquivo não suportado: {extensao}")

        # Limpar espaços dos nomes das colunas
        df.columns = df.columns.str.strip()

        return df

    def validar_membros(
        self,
        df: pd.DataFrame
    ) -> Tuple[List[MembroImportacao], List[ErroLinha]]:
        """Valida dados de membros do DataFrame"""
        membros_validos = []
        erros = []

        colunas_obrigatorias = ['nome_completo', 'email', 'igreja_id']

        # Verificar se todas as colunas obrigatórias existem
        faltando = [col for col in colunas_obrigatorias if col not in df.columns]
        if faltando:
            raise ValueError(f"Colunas obrigatórias faltando: {', '.join(faltando)}")

        for idx, row in df.iterrows():
            linha_num = idx + 2  # +2 porque Excel começa em 1 e tem cabeçalho

            try:
                # Converter row para dict e remover NaN
                dados = row.to_dict()
                dados = {k: (v if pd.notna(v) else None) for k, v in dados.items()}

                # Processar perfis se existir
                if 'perfis' in dados and dados['perfis']:
                    perfis_str = str(dados['perfis']).strip()
                    dados['perfis'] = [p.strip() for p in perfis_str.split(',')]
                else:
                    dados['perfis'] = ['avaliador']

                # Validar com Pydantic
                membro = MembroImportacao(**dados)
                membros_validos.append(membro)

            except Exception as e:
                erros.append(ErroLinha(
                    linha=linha_num,
                    mensagem=str(e),
                    dados=dados
                ))

        return membros_validos, erros

    def validar_tematicas(
        self,
        df: pd.DataFrame
    ) -> Tuple[List[TematicaImportacao], List[ErroLinha]]:
        """Valida dados de temáticas do DataFrame"""
        tematicas_validas = []
        erros = []

        colunas_obrigatorias = ['titulo', 'tipo_recorrencia']

        # Verificar colunas obrigatórias
        faltando = [col for col in colunas_obrigatorias if col not in df.columns]
        if faltando:
            raise ValueError(f"Colunas obrigatórias faltando: {', '.join(faltando)}")

        for idx, row in df.iterrows():
            linha_num = idx + 2

            try:
                dados = row.to_dict()
                dados = {k: (v if pd.notna(v) else None) for k, v in dados.items()}

                tematica = TematicaImportacao(**dados)
                tematicas_validas.append(tematica)

            except Exception as e:
                erros.append(ErroLinha(
                    linha=linha_num,
                    mensagem=str(e),
                    dados=dados
                ))

        return tematicas_validas, erros

    def importar_membros(
        self,
        membros: List[MembroImportacao],
        log_id: str
    ) -> Tuple[int, List[ErroLinha]]:
        """Importa membros no banco de dados"""
        sucesso = 0
        erros = []

        for idx, membro_data in enumerate(membros):
            linha_num = idx + 2

            try:
                # Verificar se email já existe
                exists = self.db.query(Usuario).filter(
                    Usuario.email == membro_data.email
                ).first()

                if exists:
                    erros.append(ErroLinha(
                        linha=linha_num,
                        campo='email',
                        mensagem=f'Email {membro_data.email} já cadastrado'
                    ))
                    continue

                # Verificar se igreja existe
                igreja = self.db.query(Igreja).filter(
                    Igreja.id == uuid.UUID(membro_data.igreja_id)
                ).first()

                if not igreja:
                    erros.append(ErroLinha(
                        linha=linha_num,
                        campo='igreja_id',
                        mensagem=f'Igreja {membro_data.igreja_id} não encontrada'
                    ))
                    continue

                # Converter perfis string para enum
                perfis_enum = []
                for perfil_str in membro_data.perfis:
                    try:
                        perfil_enum = PerfilUsuario[perfil_str.upper()]
                        perfis_enum.append(perfil_enum)
                    except KeyError:
                        erros.append(ErroLinha(
                            linha=linha_num,
                            campo='perfis',
                            mensagem=f'Perfil inválido: {perfil_str}'
                        ))
                        continue

                # Criar usuário
                senha_padrao = "Iasd@123"  # Senha padrão que deve ser alterada
                usuario = Usuario(
                    id=uuid.uuid4(),
                    nome_completo=membro_data.nome_completo,
                    email=membro_data.email,
                    telefone=membro_data.telefone,
                    senha_hash=pwd_context.hash(senha_padrao),
                    igreja_id=igreja.id,
                    distrito_id=igreja.distrito_id,
                    associacao_id=igreja.associacao_id,
                    perfis=perfis_enum,
                    status_aprovacao='APROVADO',  # Auto-aprovar importações
                    ativo=True,
                    cpf=membro_data.cpf,
                    cargo=membro_data.cargo
                )

                # Processar data de nascimento se fornecida
                if membro_data.data_nascimento:
                    try:
                        usuario.data_nascimento = pd.to_datetime(
                            membro_data.data_nascimento
                        ).date()
                    except:
                        pass

                self.db.add(usuario)
                sucesso += 1

            except Exception as e:
                erros.append(ErroLinha(
                    linha=linha_num,
                    mensagem=f'Erro ao criar usuário: {str(e)}'
                ))

        if sucesso > 0:
            self.db.commit()

        return sucesso, erros

    def importar_tematicas(
        self,
        tematicas: List[TematicaImportacao],
        associacao_id: str,
        log_id: str
    ) -> Tuple[int, List[ErroLinha]]:
        """Importa temáticas no banco de dados"""
        sucesso = 0
        erros = []

        for idx, tematica_data in enumerate(tematicas):
            linha_num = idx + 2

            try:
                # Validar tipo de recorrência
                tipo_rec = TipoRecorrencia[tematica_data.tipo_recorrencia]

                # Criar temática
                tematica = Tematica(
                    id=uuid.uuid4(),
                    titulo=tematica_data.titulo,
                    descricao=tematica_data.descricao,
                    referencia_biblica=tematica_data.referencia_biblica,
                    tipo_recorrencia=tipo_rec,
                    associacao_id=uuid.UUID(associacao_id),
                    criado_por=uuid.UUID(self.usuario_id)
                )

                # Processar campos específicos do tipo de recorrência
                if tipo_rec == TipoRecorrencia.DATA_ESPECIFICA:
                    if not tematica_data.data_especifica:
                        erros.append(ErroLinha(
                            linha=linha_num,
                            campo='data_especifica',
                            mensagem='data_especifica é obrigatória para tipo DATA_ESPECIFICA'
                        ))
                        continue
                    tematica.data_especifica = pd.to_datetime(
                        tematica_data.data_especifica
                    ).date()

                elif tipo_rec == TipoRecorrencia.SEMANAL:
                    if not tematica_data.dia_semana_semanal:
                        erros.append(ErroLinha(
                            linha=linha_num,
                            campo='dia_semana_semanal',
                            mensagem='dia_semana_semanal é obrigatório para tipo SEMANAL'
                        ))
                        continue
                    tematica.dia_semana_semanal = DiaSemana[
                        tematica_data.dia_semana_semanal.upper()
                    ]

                elif tipo_rec == TipoRecorrencia.MENSAL:
                    if not tematica_data.numero_semana_mes or not tematica_data.dia_semana_mensal:
                        erros.append(ErroLinha(
                            linha=linha_num,
                            campo='mensal',
                            mensagem='numero_semana_mes e dia_semana_mensal são obrigatórios para tipo MENSAL'
                        ))
                        continue
                    tematica.numero_semana_mes = tematica_data.numero_semana_mes
                    tematica.dia_semana_mensal = DiaSemana[
                        tematica_data.dia_semana_mensal.upper()
                    ]

                # Processar período de validade
                if tematica_data.valido_de:
                    tematica.valido_de = pd.to_datetime(tematica_data.valido_de).date()
                if tematica_data.valido_ate:
                    tematica.valido_ate = pd.to_datetime(tematica_data.valido_ate).date()

                self.db.add(tematica)
                sucesso += 1

            except Exception as e:
                erros.append(ErroLinha(
                    linha=linha_num,
                    mensagem=f'Erro ao criar temática: {str(e)}'
                ))

        if sucesso > 0:
            self.db.commit()

        return sucesso, erros

    def processar_importacao(
        self,
        arquivo_path: str,
        tipo_importacao: TipoImportacao,
        validar_apenas: bool = False,
        associacao_id: str = None
    ) -> LogImportacao:
        """Processa importação completa"""

        # Criar log de importação
        log = LogImportacao(
            id=uuid.uuid4(),
            tipo_importacao=tipo_importacao.value,
            nome_arquivo=os.path.basename(arquivo_path),
            tamanho_arquivo=os.path.getsize(arquivo_path),
            status=StatusImportacao.PROCESSANDO.value,
            iniciado_em=datetime.utcnow(),
            usuario_id=uuid.UUID(self.usuario_id)
        )
        self.db.add(log)
        self.db.commit()

        try:
            # Ler arquivo
            df = self.ler_arquivo(arquivo_path)
            log.total_linhas = len(df)

            # Processar baseado no tipo
            if tipo_importacao == TipoImportacao.MEMBROS:
                membros_validos, erros_validacao = self.validar_membros(df)

                if not validar_apenas and membros_validos:
                    sucesso, erros_importacao = self.importar_membros(
                        membros_validos,
                        str(log.id)
                    )
                    log.linhas_sucesso = sucesso
                    log.linhas_erro = len(erros_validacao) + len(erros_importacao)
                    log.erros = [e.dict() for e in (erros_validacao + erros_importacao)]
                else:
                    log.linhas_sucesso = len(membros_validos)
                    log.linhas_erro = len(erros_validacao)
                    log.erros = [e.dict() for e in erros_validacao]

            elif tipo_importacao == TipoImportacao.TEMATICAS:
                if not associacao_id:
                    raise ValueError("associacao_id é obrigatório para importação de temáticas")

                tematicas_validas, erros_validacao = self.validar_tematicas(df)

                if not validar_apenas and tematicas_validas:
                    sucesso, erros_importacao = self.importar_tematicas(
                        tematicas_validas,
                        associacao_id,
                        str(log.id)
                    )
                    log.linhas_sucesso = sucesso
                    log.linhas_erro = len(erros_validacao) + len(erros_importacao)
                    log.erros = [e.dict() for e in (erros_validacao + erros_importacao)]
                else:
                    log.linhas_sucesso = len(tematicas_validas)
                    log.linhas_erro = len(erros_validacao)
                    log.erros = [e.dict() for e in erros_validacao]

            log.status = StatusImportacao.CONCLUIDO.value
            log.concluido_em = datetime.utcnow()

        except Exception as e:
            log.status = StatusImportacao.ERRO.value
            log.concluido_em = datetime.utcnow()
            log.erros = [{'mensagem': str(e)}]
            log.linhas_erro = log.total_linhas or 0

        self.db.commit()
        self.db.refresh(log)
        return log


def gerar_template_membros() -> pd.DataFrame:
    """Gera template Excel para importação de membros"""
    data = {
        'nome_completo': ['João da Silva', 'Maria Santos'],
        'email': ['joao@exemplo.com', 'maria@exemplo.com'],
        'telefone': ['11999999999', '11888888888'],
        'igreja_id': ['uuid-da-igreja', 'uuid-da-igreja'],
        'perfis': ['avaliador', 'pregador,avaliador'],
        'cpf': ['123.456.789-00', ''],
        'data_nascimento': ['1990-01-15', '1985-05-20'],
        'cargo': ['Ancião', 'Diaconisa']
    }
    return pd.DataFrame(data)


def gerar_template_tematicas() -> pd.DataFrame:
    """Gera template Excel para importação de temáticas"""
    data = {
        'titulo': ['Santificação do Sábado', 'Volta de Jesus'],
        'descricao': ['Importância da observância do sábado', 'Sinais da segunda vinda'],
        'referencia_biblica': ['Êxodo 20:8-11', 'Mateus 24'],
        'tipo_recorrencia': ['SEMANAL', 'MENSAL'],
        'data_especifica': ['', ''],
        'dia_semana_semanal': ['SABADO', ''],
        'numero_semana_mes': ['', '1'],
        'dia_semana_mensal': ['', 'DOMINGO'],
        'valido_de': ['2025-01-01', '2025-01-01'],
        'valido_ate': ['2025-12-31', '2025-12-31']
    }
    return pd.DataFrame(data)
