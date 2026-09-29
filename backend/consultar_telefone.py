from app.database import SessionLocal
from app.models.usuario import Usuario

db = SessionLocal()
usuario = db.query(Usuario).filter(Usuario.email == 'pregador1.distrito1@apostello.com').first()
if usuario:
    print(f'Banco de dados: {usuario.telefone}')
else:
    print('Usuário não encontrado')
db.close()
