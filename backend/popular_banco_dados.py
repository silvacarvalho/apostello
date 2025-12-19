"""
Script para popular o banco de dados com estrutura de teste:
- 5 Distritos
- 45 pregadores por distrito
- 28 cantores por distrito
- 10 igrejas por distrito
- 35 membros por igreja
- 1 Pastor Distrital e 1 Líder Distrital por distrito

Executar: python -m app.scripts.populate_database
"""
import sys
import os
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.usuario import Usuario
from app.models.organizacao import Organizacao
from app.models.distrito import Distrito
from app.models.igreja import Igreja
from app.models.enums import TipoUsuario, StatusGeral, StatusAprovacao
from app.core.security import get_password_hash


def populate_database():
    """Popular o banco de dados com dados de teste"""
    db: Session = SessionLocal()
    
    try:
        print("\n" + "=" * 70)
        print("🚀 INICIANDO POPULAÇÃO DO BANCO DE DADOS")
        print("=" * 70 + "\n")
        
        # Verificar se existe organização
        organizacao = db.query(Organizacao).first()
        if not organizacao:
            print("📦 Criando organização...")
            organizacao = Organizacao(
                nome="Apostello - Organização Principal",
                cnpj="12345678000199"
            )
            db.add(organizacao)
            db.commit()
            db.refresh(organizacao)
            print(f"   ✅ Organização criada: {organizacao.nome}\n")
        else:
            print(f"📦 Usando organização existente: {organizacao.nome}\n")
        
        # Criar 5 Distritos
        distritos = []
        nomes_distritos = ["Norte", "Sul", "Leste", "Oeste", "Central"]
        
        print("🏛️  Criando 5 Distritos...")
        for i, nome in enumerate(nomes_distritos, 1):
            distrito = Distrito(
                organizacao_id=organizacao.id,
                nome=f"Distrito {nome}",
                descricao=f"Distrito da região {nome}",
                status=StatusGeral.ATIVO
            )
            db.add(distrito)
            db.flush()
            distritos.append(distrito)
            print(f"   ✅ Distrito {i}/5: {distrito.nome}")
        
        db.commit()
        print(f"\n✅ 5 Distritos criados com sucesso!\n")
        
        # Para cada distrito, criar pregadores, cantores, igrejas e membros
        total_pregadores = 0
        total_cantores = 0
        total_igrejas = 0
        total_membros = 0
        
        for idx_distrito, distrito in enumerate(distritos, 1):
            print(f"\n{'=' * 70}")
            print(f"📍 DISTRITO {idx_distrito}: {distrito.nome}")
            print(f"{'=' * 70}\n")
            
            # Criar 45 pregadores
            print(f"👨‍🏫 Criando 45 pregadores...")
            pregadores = []
            for i in range(1, 46):
                pregador = Usuario(
                    nome_completo=f"Pregador {i} - {distrito.nome}",
                    email=f"pregador{i}.distrito{idx_distrito}@apostello.com",
                    senha_hash=get_password_hash("senha123"),
                    cpf=f"{idx_distrito:02d}{i:03d}00000{i % 10}",
                    telefone=f"119{idx_distrito}{i:04d}",
                    whatsapp=f"119{idx_distrito}{i:04d}",
                    data_nascimento=date(1980 + (i % 30), 1 + (i % 12), 1 + (i % 28)),
                    tipo=TipoUsuario.PREGADOR,
                    distrito_id=distrito.id,
                    status=StatusGeral.ATIVO,
                    status_aprovacao=StatusAprovacao.APROVADO,
                    score_atual=70.00 + (i % 30),
                    contador_mes_atual=0,
                    contador_total_participacoes=i % 50,
                    contador_faltas=0,
                    contador_desmarcacoes=0
                )
                db.add(pregador)
                pregadores.append(pregador)
                if i % 15 == 0:
                    print(f"   ✅ {i}/45 pregadores criados...")
            
            db.flush()
            total_pregadores += 45
            print(f"   ✅ 45 pregadores criados!\n")
            
            # Definir Pastor Distrital (pregador 1) e Líder Distrital (pregador 2)
            pastor_distrital = pregadores[0]
            pastor_distrital.tipo = TipoUsuario.PASTOR_DISTRITAL
            lider_distrital = pregadores[1]
            lider_distrital.tipo = TipoUsuario.LIDER_DISTRITAL
            
            distrito.pastor_distrital_id = pastor_distrital.id
            distrito.lider_distrital_id = lider_distrital.id
            
            print(f"👔 Pastor Distrital: {pastor_distrital.nome_completo}")
            print(f"👔 Líder Distrital: {lider_distrital.nome_completo}\n")
            
            # Criar 28 cantores
            print(f"🎤 Criando 28 cantores...")
            for i in range(1, 29):
                cantor = Usuario(
                    nome_completo=f"Cantor {i} - {distrito.nome}",
                    email=f"cantor{i}.distrito{idx_distrito}@apostello.com",
                    senha_hash=get_password_hash("senha123"),
                    cpf=f"{idx_distrito:02d}{50 + i:03d}000{i % 10}",
                    telefone=f"118{idx_distrito}{i:04d}",
                    whatsapp=f"118{idx_distrito}{i:04d}",
                    data_nascimento=date(1985 + (i % 25), 1 + (i % 12), 1 + (i % 28)),
                    tipo=TipoUsuario.CANTOR,
                    distrito_id=distrito.id,
                    status=StatusGeral.ATIVO,
                    status_aprovacao=StatusAprovacao.APROVADO,
                    score_atual=70.00 + (i % 25),
                    contador_mes_atual=0,
                    contador_total_participacoes=i % 40,
                    contador_faltas=0,
                    contador_desmarcacoes=0
                )
                db.add(cantor)
                if i % 14 == 0:
                    print(f"   ✅ {i}/28 cantores criados...")
            
            db.flush()
            total_cantores += 28
            print(f"   ✅ 28 cantores criados!\n")
            
            # Criar 10 igrejas
            print(f"⛪ Criando 10 igrejas...")
            igrejas = []
            for i in range(1, 11):
                igreja = Igreja(
                    distrito_id=distrito.id,
                    nome=f"Igreja {i} - {distrito.nome}",
                    endereco_completo=f"Rua {i}, nº {i * 100} - Bairro {distrito.nome}",
                    telefone=f"115{idx_distrito}{i:03d}0000",
                    email=f"igreja{i}.distrito{idx_distrito}@apostello.com",
                    status=StatusGeral.ATIVO
                )
                db.add(igreja)
                db.flush()
                igrejas.append(igreja)
                print(f"   ✅ Igreja {i}/10: {igreja.nome}")
            
            total_igrejas += 10
            print(f"\n   ✅ 10 igrejas criadas!\n")
            
            # Para cada igreja, criar 35 membros
            print(f"👥 Criando 35 membros para cada igreja (350 membros total)...")
            membros_criados = 0
            for idx_igreja, igreja in enumerate(igrejas, 1):
                for i in range(1, 36):
                    membro = Usuario(
                        nome_completo=f"Membro {i} - {igreja.nome}",
                        email=f"membro{i}.igreja{idx_igreja}.distrito{idx_distrito}@apostello.com",
                        senha_hash=get_password_hash("senha123"),
                        cpf=f"{idx_distrito:02d}{idx_igreja:02d}{i:03d}00{i % 10}",
                        telefone=f"117{idx_distrito}{idx_igreja:02d}{i:04d}",
                        whatsapp=f"117{idx_distrito}{idx_igreja:02d}{i:04d}",
                        data_nascimento=date(1990 + (i % 20), 1 + (i % 12), 1 + (i % 28)),
                        tipo=TipoUsuario.MEMBRO,
                        distrito_id=distrito.id,
                        igreja_id=igreja.id,
                        status=StatusGeral.ATIVO,
                        status_aprovacao=StatusAprovacao.APROVADO
                    )
                    db.add(membro)
                    membros_criados += 1
                
                if idx_igreja % 2 == 0:
                    db.flush()
                    print(f"   ✅ {membros_criados}/350 membros criados...")
            
            db.flush()
            total_membros += membros_criados
            print(f"   ✅ 350 membros criados para o distrito!\n")
        
        # Commit final
        db.commit()
        
        # Resumo final
        print("\n" + "=" * 70)
        print("✅ POPULAÇÃO DO BANCO DE DADOS CONCLUÍDA COM SUCESSO!")
        print("=" * 70)
        print(f"\n📊 RESUMO:")
        print(f"   🏛️  Distritos: 5")
        print(f"   👨‍🏫 Pregadores: {total_pregadores}")
        print(f"   👔 Pastores Distritais: 5")
        print(f"   👔 Líderes Distritais: 5")
        print(f"   🎤 Cantores: {total_cantores}")
        print(f"   ⛪ Igrejas: {total_igrejas}")
        print(f"   👥 Membros: {total_membros}")
        print(f"   📈 TOTAL DE USUÁRIOS: {total_pregadores + total_cantores + total_membros}")
        print("\n" + "=" * 70 + "\n")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro ao popular banco de dados: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    populate_database()
