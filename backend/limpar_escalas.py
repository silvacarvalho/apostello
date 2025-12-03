#!/usr/bin/env python3
"""
Script para verificar e limpar escalas para testes
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models import Distrito, Escala, Pregacao

def main():
    session = SessionLocal()
    try:
        # Buscar distrito
        distrito = session.query(Distrito).filter(Distrito.ativo == True).first()
        print(f"Distrito: {distrito.nome}")
        
        # Listar todas as escalas
        escalas = session.query(Escala).filter(Escala.distrito_id == distrito.id).all()
        print(f"\nEscalas existentes: {len(escalas)}")
        for e in escalas:
            pregacoes_count = session.query(Pregacao).filter(Pregacao.escala_id == e.id).count()
            print(f"   {e.codigo}: {e.mes_referencia}/{e.ano_referencia} - {pregacoes_count} pregações")
        
        # Limpar escala de março/2026 se existir
        escala_marco = session.query(Escala).filter(
            Escala.distrito_id == distrito.id,
            Escala.mes_referencia == 3,
            Escala.ano_referencia == 2026
        ).first()
        
        if escala_marco:
            print(f"\n🗑️ Removendo escala março/2026: {escala_marco.codigo}")
            session.delete(escala_marco)
            session.commit()
            print("✅ Escala removida")
        else:
            print("\n✅ Março/2026 está livre para teste")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    main()