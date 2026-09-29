"""Script para atualizar telefone do usuário para teste de SMS"""
from app.database import SessionLocal
from app.models.usuario import Usuario

db = SessionLocal()
usuario = db.query(Usuario).filter(Usuario.email == 'pregador1.distrito1@apostello.com').first()
if usuario:
    usuario.telefone = '+559492982113'
    db.commit()
    print(f'Atualizado: {usuario.nome_completo}')
    print(f'  Telefone: {usuario.telefone}')
else:
    print('Usuario nao encontrado')
db.close()
