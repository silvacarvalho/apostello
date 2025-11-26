"""Router: Temáticas"""
from typing import List
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_membro_associacao, get_current_active_user
from app.models import Tematica, Usuario
from app.schemas.tematica import TematicaCreate, TematicaUpdate, TematicaResponse

router = APIRouter()

@router.post("/", response_model=TematicaResponse, status_code=status.HTTP_201_CREATED)
def criar_tematica(data: TematicaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_membro_associacao)):
    try:
        # Validar se o usuário tem associação
        if not current_user.associacao_id:
            raise HTTPException(status_code=400, detail="Usuário não possui associação vinculada")
        
        tematica_dict = data.dict(exclude_unset=True)
        tematica_dict['associacao_id'] = current_user.associacao_id
        tematica_dict['criado_por'] = current_user.id
        
        # Não precisamos converter para enum, o SQLAlchemy faz isso automaticamente
        # mantemos as strings em minúsculas como esperado pelo banco
        
        nova_tematica = Tematica(**tematica_dict)
        db.add(nova_tematica)
        db.commit()
        db.refresh(nova_tematica)
        return nova_tematica
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao criar temática: {str(e)}")

@router.get("/", response_model=List[TematicaResponse])
def listar_tematicas(associacao_id: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    from datetime import date
    
    # Inativar automaticamente temáticas expiradas
    hoje = date.today()
    tematicas_expiradas = db.query(Tematica).filter(
        Tematica.ativo == True,
        Tematica.valido_ate.isnot(None),
        Tematica.valido_ate < hoje
    ).all()
    
    for tematica in tematicas_expiradas:
        tematica.ativo = False
    
    if tematicas_expiradas:
        db.commit()
    
    # Listar temáticas
    query = db.query(Tematica)
    if associacao_id:
        query = query.filter(Tematica.associacao_id == associacao_id)
    tematicas = query.offset(skip).limit(limit).all()
    return tematicas

@router.get("/{tematica_id}", response_model=TematicaResponse)
def obter_tematica(tematica_id: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    tematica = db.query(Tematica).filter(Tematica.id == tematica_id).first()
    if not tematica:
        raise HTTPException(status_code=404, detail="Temática não encontrada")
    return tematica

@router.put("/{tematica_id}", response_model=TematicaResponse)
def atualizar_tematica(tematica_id: str, data: TematicaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_membro_associacao)):
    tematica = db.query(Tematica).filter(Tematica.id == tematica_id).first()
    if not tematica:
        raise HTTPException(status_code=404, detail="Temática não encontrada")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(tematica, key, value)
    db.commit()
    db.refresh(tematica)
    return tematica

@router.get("/template/download")
def download_template(current_user: Usuario = Depends(require_membro_associacao)):
    """Download template CSV para importação de temáticas"""
    # Criar CSV em memória
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Cabeçalho
    writer.writerow([
        'titulo',
        'descricao',
        'referencia_biblica',
        'tipo_recorrencia',
        'data_especifica',
        'semana_toda',
        'dia_semana_semanal',
        'numero_semana_mes',
        'dia_semana_mensal',
        'valido_de',
        'valido_ate',
        'ativo'
    ])
    
    # Linhas de exemplo
    # Exemplo 1: Data específica
    writer.writerow([
        'A Graça de Deus',
        'Mensagem sobre a graça salvadora de Deus através de Jesus Cristo',
        'Efésios 2:8-9',
        'data_especifica',
        '2026-12-25',  # data_especifica
        '',  # semana_toda
        '',  # dia_semana_semanal
        '',  # numero_semana_mes
        '',  # dia_semana_mensal
        '',  # valido_de
        '',  # valido_ate
        'true'
    ])
    
    # Exemplo 2: Recorrência semanal
    writer.writerow([
        'Culto de Jovens',
        'Mensagem direcionada aos jovens da igreja',
        'Provérbios 3:5-6',
        'semanal',
        '',  # data_especifica
        '',  # semana_toda
        'sabado',  # dia_semana_semanal (domingo, segunda, terca, quarta, quinta, sexta, sabado)
        '',  # numero_semana_mes
        '',  # dia_semana_mensal
        '2026-01-01',  # valido_de
        '2026-12-31',  # valido_ate
        'true'
    ])
    
    # Exemplo 3: Recorrência mensal
    writer.writerow([
        'Santa Ceia',
        'Celebração da Santa Ceia',
        '1 Coríntios 11:23-26',
        'mensal',
        '',  # data_especifica
        '',  # semana_toda
        '',  # dia_semana_semanal
        '1',  # numero_semana_mes (1=Primeiro, 2=Segundo, 3=Terceiro, 4=Quarto, 5=Último)
        'domingo',  # dia_semana_mensal
        '2026-01-01',  # valido_de
        '2026-12-31',  # valido_ate
        'true'
    ])
    
    # Exemplo 4: Recorrência semanal - semana toda
    writer.writerow([
        'Campanha de Evangelismo',
        'Semana especial de evangelismo e pregações temáticas',
        'Mateus 28:19-20',
        'semanal',
        '',  # data_especifica
        'true',  # semana_toda
        '',  # dia_semana_semanal (deixar vazio quando semana_toda=true)
        '',  # numero_semana_mes
        '',  # dia_semana_mensal
        '2026-03-01',  # valido_de
        '2026-03-07',  # valido_ate
        'true'
    ])
    
    # Preparar para download
    output.seek(0)
    # Adicionar BOM UTF-8 para Excel reconhecer acentuação corretamente
    csv_content = '\ufeff' + output.getvalue()
    
    return StreamingResponse(
        iter([csv_content.encode('utf-8')]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=template_tematicas.csv"
        }
    )

@router.post("/template/upload")
async def upload_template(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_membro_associacao)
):
    """Upload e importação de temáticas via CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Arquivo deve ser CSV")
    
    try:
        # Ler conteúdo do arquivo
        contents = await file.read()
        # Decodificar removendo BOM UTF-8 se presente
        decoded = contents.decode('utf-8-sig')
        
        # Parse CSV com delimitador ponto-e-vírgula
        csv_reader = csv.DictReader(io.StringIO(decoded), delimiter=';')
        
        tematicas_criadas = []
        erros = []
        
        for index, row in enumerate(csv_reader, start=2):
            try:
                # Validar campos obrigatórios
                if not row.get('titulo'):
                    erros.append(f"Linha {index}: título é obrigatório")
                    continue
                
                if not row.get('tipo_recorrencia'):
                    erros.append(f"Linha {index}: tipo_recorrencia é obrigatório")
                    continue
                
                tipo_recorrencia = row['tipo_recorrencia'].strip().lower()
                
                # Validar tipo de recorrência
                if tipo_recorrencia not in ['data_especifica', 'semanal', 'mensal']:
                    erros.append(f"Linha {index}: tipo_recorrencia inválido (use: data_especifica, semanal ou mensal)")
                    continue
                
                # Preparar dados da temática
                tematica_data = {
                    'titulo': row['titulo'].strip(),
                    'descricao': row.get('descricao', '').strip() if row.get('descricao') else None,
                    'referencia_biblica': row.get('referencia_biblica', '').strip() if row.get('referencia_biblica') else None,
                    'associacao_id': current_user.associacao_id,
                    'tipo_recorrencia': tipo_recorrencia,
                    'criado_por': current_user.id,
                    'ativo': row.get('ativo', 'true').strip().lower() in ['true', '1', 'sim', 'yes']
                }
                
                # Validar e adicionar campos específicos por tipo de recorrência
                if tipo_recorrencia == 'data_especifica':
                    if not row.get('data_especifica'):
                        erros.append(f"Linha {index}: data_especifica é obrigatória para tipo 'data_especifica'")
                        continue
                    from datetime import datetime
                    try:
                        tematica_data['data_especifica'] = datetime.strptime(row['data_especifica'].strip(), '%Y-%m-%d').date()
                    except ValueError:
                        erros.append(f"Linha {index}: data_especifica deve estar no formato YYYY-MM-DD")
                        continue
                
                elif tipo_recorrencia == 'semanal':
                    if not row.get('valido_de') or not row.get('valido_ate'):
                        erros.append(f"Linha {index}: valido_de e valido_ate são obrigatórios para tipo 'semanal'")
                        continue
                    
                    # Verificar se é semana toda ou dia específico
                    semana_toda = row.get('semana_toda', '').strip().lower() in ['true', '1', 'sim', 'yes']
                    
                    if semana_toda:
                        tematica_data['semana_toda'] = True
                        tematica_data['dia_semana_semanal'] = None
                    else:
                        if not row.get('dia_semana_semanal'):
                            erros.append(f"Linha {index}: dia_semana_semanal é obrigatório quando semana_toda não está marcado")
                            continue
                        
                        dia_semanal = row['dia_semana_semanal'].strip().lower()
                        if dia_semanal not in ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']:
                            erros.append(f"Linha {index}: dia_semana_semanal inválido")
                            continue
                        
                        tematica_data['semana_toda'] = False
                        tematica_data['dia_semana_semanal'] = dia_semanal
                    
                    from datetime import datetime
                    try:
                        tematica_data['valido_de'] = datetime.strptime(row['valido_de'].strip(), '%Y-%m-%d').date()
                        tematica_data['valido_ate'] = datetime.strptime(row['valido_ate'].strip(), '%Y-%m-%d').date()
                    except ValueError:
                        erros.append(f"Linha {index}: valido_de e valido_ate devem estar no formato YYYY-MM-DD")
                        continue
                
                elif tipo_recorrencia == 'mensal':
                    if not row.get('numero_semana_mes') or not row.get('dia_semana_mensal'):
                        erros.append(f"Linha {index}: numero_semana_mes e dia_semana_mensal são obrigatórios para tipo 'mensal'")
                        continue
                    
                    try:
                        numero_semana = int(row['numero_semana_mes'].strip())
                        if numero_semana < 1 or numero_semana > 5:
                            erros.append(f"Linha {index}: numero_semana_mes deve ser entre 1 e 5")
                            continue
                        tematica_data['numero_semana_mes'] = numero_semana
                    except ValueError:
                        erros.append(f"Linha {index}: numero_semana_mes deve ser um número")
                        continue
                    
                    dia_mensal = row['dia_semana_mensal'].strip().lower()
                    if dia_mensal not in ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']:
                        erros.append(f"Linha {index}: dia_semana_mensal inválido")
                        continue
                    
                    tematica_data['dia_semana_mensal'] = dia_mensal
                    
                    # Período de validade opcional para mensal
                    if row.get('valido_de') and row.get('valido_ate'):
                        from datetime import datetime
                        try:
                            tematica_data['valido_de'] = datetime.strptime(row['valido_de'].strip(), '%Y-%m-%d').date()
                            tematica_data['valido_ate'] = datetime.strptime(row['valido_ate'].strip(), '%Y-%m-%d').date()
                        except ValueError:
                            erros.append(f"Linha {index}: valido_de e valido_ate devem estar no formato YYYY-MM-DD")
                            continue
                
                # Criar temática
                nova_tematica = Tematica(**tematica_data)
                
                db.add(nova_tematica)
                tematicas_criadas.append(row['titulo'])
                
            except Exception as e:
                erros.append(f"Linha {index}: {str(e)}")
        
        # Commit apenas se não houver erros
        if erros:
            db.rollback()
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Erros encontrados na importação",
                    "erros": erros
                }
            )
        
        db.commit()
        
        return {
            "message": f"{len(tematicas_criadas)} temáticas importadas com sucesso",
            "tematicas": tematicas_criadas
        }
        
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Erro ao decodificar arquivo. Certifique-se de que está em UTF-8"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
