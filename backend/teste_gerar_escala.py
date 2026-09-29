"""
Script para testar geração de escala sem conflitos
"""
from app.database import SessionLocal
from app.services.escala_service import EscalaService
from app.schemas.escala import EscalaGenerateRequest
from app.models.usuario import Usuario
from sqlalchemy import text

db = SessionLocal()
try:
    # Buscar um admin
    pastor = db.execute(text('''
        SELECT id, nome_completo, distrito_id 
        FROM usuario 
        WHERE tipo = 'ADMIN' AND status = 'ATIVO'
        LIMIT 1
    ''')).first()
    
    print(f'Usando usuário: {pastor[1]} (ID: {pastor[0]})')
    
    # Buscar objeto usuario
    current_user = db.query(Usuario).filter(Usuario.id == pastor[0]).first()
    
    # Criar request
    request = EscalaGenerateRequest(
        distrito_id=18,  # Distrito Norte
        mes=4,
        ano=2026,
        usar_score=True,
        priorizar_sabado=True,
        respeitar_intervalo=True,
        respeitar_recorrencia=True
    )
    
    # Gerar escala
    service = EscalaService(db)
    escala = service.generate(request, current_user)
    
    print(f'Escala gerada com sucesso! ID: {escala.id}')
    print(f'Status: {escala.status}')
    
    # Verificar conflitos na escala gerada
    conflitos_pregador = db.execute(text('''
        SELECT COUNT(*) FROM (
            SELECT i1.id
            FROM item_escala i1
            JOIN item_escala i2 ON 
                i1.data_culto = i2.data_culto AND 
                i1.pregador_id = i2.pregador_id AND 
                i1.id < i2.id AND
                i1.igreja_id != i2.igreja_id AND
                i1.escala_id = :escala_id
            WHERE i1.pregador_id IS NOT NULL
        ) as sub
    '''), {'escala_id': escala.id}).scalar()
    
    conflitos_cantor = db.execute(text('''
        SELECT COUNT(*) FROM (
            SELECT i1.id
            FROM item_escala i1
            JOIN item_escala i2 ON 
                i1.data_culto = i2.data_culto AND 
                i1.cantor_id = i2.cantor_id AND 
                i1.id < i2.id AND
                i1.igreja_id != i2.igreja_id AND
                i1.escala_id = :escala_id
            WHERE i1.cantor_id IS NOT NULL
        ) as sub
    '''), {'escala_id': escala.id}).scalar()
    
    print('')
    print('=== RESULTADO ===')
    print(f'Conflitos de pregadores: {conflitos_pregador}')
    print(f'Conflitos de cantores: {conflitos_cantor}')
    
    if conflitos_pregador == 0 and conflitos_cantor == 0:
        print('OK Escala gerada SEM conflitos!')
    else:
        print('ERRO Ainda existem conflitos na escala gerada')
        
    db.commit()
    
except Exception as e:
    print(f'Erro: {e}')
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
