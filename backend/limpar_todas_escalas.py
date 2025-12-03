#!/usr/bin/env python3
"""
Script para limpar TODAS as escalas e pregações do banco de dados.
CUIDADO: Esta operação é IRREVERSÍVEL!
"""

import psycopg2
from app.core.config import settings

def limpar_todas_escalas():
    """Remove todas as escalas e pregações do banco de dados."""
    
    try:
        conn = psycopg2.connect(settings.DATABASE_URL.replace('+psycopg2', ''))
        cursor = conn.cursor()
        
        print("=== LIMPEZA COMPLETA DE ESCALAS E PREGAÇÕES ===")
        print("⚠️  ATENÇÃO: Esta operação irá remover TODAS as escalas e pregações!")
        
        # Verificar quantos registros existem antes
        cursor.execute("SELECT COUNT(*) FROM pregacoes")
        total_pregacoes = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM escalas")
        total_escalas = cursor.fetchone()[0]
        
        print(f"📊 Estado atual do banco:")
        print(f"   - Pregações existentes: {total_pregacoes}")
        print(f"   - Escalas existentes: {total_escalas}")
        
        if total_escalas == 0 and total_pregacoes == 0:
            print("✅ Banco já está limpo! Nenhuma escala ou pregação encontrada.")
            return
        
        print(f"\n🗑️  Iniciando limpeza...")
        
        # 1. Primeiro, remover todas as pregações
        print("   1. Removendo todas as pregações...")
        cursor.execute("DELETE FROM pregacoes")
        pregacoes_removidas = cursor.rowcount
        print(f"      ✅ {pregacoes_removidas} pregações removidas")
        
        # 2. Depois, remover todas as escalas
        print("   2. Removendo todas as escalas...")
        cursor.execute("DELETE FROM escalas")
        escalas_removidas = cursor.rowcount
        print(f"      ✅ {escalas_removidas} escalas removidas")
        
        # 3. Commit das alterações
        conn.commit()
        
        # 4. Verificação final
        print("\n📋 Verificação final:")
        cursor.execute("SELECT COUNT(*) FROM pregacoes")
        pregacoes_final = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM escalas")
        escalas_final = cursor.fetchone()[0]
        
        print(f"   - Pregações restantes: {pregacoes_final}")
        print(f"   - Escalas restantes: {escalas_final}")
        
        if pregacoes_final == 0 and escalas_final == 0:
            print("\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!")
            print("   📊 Resumo da operação:")
            print(f"      - {pregacoes_removidas} pregações removidas")
            print(f"      - {escalas_removidas} escalas removidas")
            print("   ✅ Banco de dados limpo e pronto para novas escalas")
        else:
            print(f"\n❌ ERRO: Ainda existem registros no banco!")
            print(f"   - Pregações: {pregacoes_final}")
            print(f"   - Escalas: {escalas_final}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro durante a limpeza: {e}")
        if conn:
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    # Confirmação de segurança
    print("⚠️  OPERAÇÃO DE LIMPEZA COMPLETA ⚠️")
    print("Esta operação irá remover TODAS as escalas e pregações do banco.")
    print("Esta ação é IRREVERSÍVEL!")
    
    confirmacao = input("\nDigite 'CONFIRMO' para prosseguir com a limpeza: ")
    
    if confirmacao.upper() == "CONFIRMO":
        limpar_todas_escalas()
    else:
        print("❌ Operação cancelada pelo usuário.")