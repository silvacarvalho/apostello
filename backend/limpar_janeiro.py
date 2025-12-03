#!/usr/bin/env python3
"""
Script para limpar escala vazia de janeiro/2026 usando SQL direto
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models import Distrito, Escala

def main():
    session = SessionLocal()
    try:
        # Buscar distrito
        distrito = session.query(Distrito).filter(Distrito.ativo == True).first()
        print(f"Distrito: {distrito.nome}")
        
        # Buscar escala de janeiro/2026
        escala_janeiro = session.query(Escala).filter(
            Escala.distrito_id == distrito.id,
            Escala.mes_referencia == 1,
            Escala.ano_referencia == 2026
        ).first()
        
        if escala_janeiro:
            print(f"🗑️ Removendo escala janeiro/2026: {escala_janeiro.codigo}")
            
            # Usar SQL direto para evitar problemas de relacionamento
            escala_id = str(escala_janeiro.id)
            
            # Deletar pregações primeiro (se houver)
            from sqlalchemy import text
            session.execute(text(f"DELETE FROM pregacoes WHERE escala_id = '{escala_id}'"))
            
            # Deletar a escala
            session.execute(text(f"DELETE FROM escalas WHERE id = '{escala_id}'"))
            
            session.commit()
            print("✅ Escala de janeiro/2026 removida com sucesso")
        else:
            print("✅ Janeiro/2026 não existe - pronto para nova geração")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main()