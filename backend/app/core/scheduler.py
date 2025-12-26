"""
Scheduler de Jobs - APScheduler
Gerencia jobs agendados para lembretes e outras tarefas
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
import logging
import atexit

from app.services.lembrete_service import (
    executar_lembretes_7d,
    executar_lembretes_3d,
    executar_lembretes_24h
)

logger = logging.getLogger(__name__)

# Configuração do scheduler
jobstores = {
    'default': MemoryJobStore()
}

executors = {
    'default': ThreadPoolExecutor(10)
}

job_defaults = {
    'coalesce': True,  # Combina múltiplas execuções pendentes em uma
    'max_instances': 1,  # Apenas uma instância do job por vez
    'misfire_grace_time': 3600  # Tolerância de 1 hora para jobs atrasados
}

scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults,
    timezone='America/Sao_Paulo'
)


def executar_arquivamento_escalas():
    """
    Executa o arquivamento automático de escalas antigas.
    Arquiva escalas publicadas de 3 ou mais meses atrás.
    """
    from app.database import SessionLocal
    from app.services.escala_service import EscalaService
    
    logger.info("Iniciando arquivamento automático de escalas...")
    
    db = SessionLocal()
    try:
        service = EscalaService(db)
        count = service.archive_old_scales(months_old=3)
        logger.info(f"Arquivamento concluído: {count} escala(s) arquivada(s)")
    except Exception as e:
        logger.error(f"Erro no arquivamento automático: {e}")
    finally:
        db.close()


def init_scheduler():
    """Inicializa o scheduler com todos os jobs"""
    if scheduler.running:
        logger.info("Scheduler já está rodando")
        return
    
    # Job de lembretes 7 dias - roda todos os dias às 8h
    scheduler.add_job(
        executar_lembretes_7d,
        trigger=CronTrigger(hour=8, minute=0),
        id='lembretes_7d',
        name='Lembretes 7 dias antes do culto',
        replace_existing=True
    )
    
    # Job de lembretes 3 dias - roda todos os dias às 9h
    scheduler.add_job(
        executar_lembretes_3d,
        trigger=CronTrigger(hour=9, minute=0),
        id='lembretes_3d',
        name='Lembretes 3 dias antes do culto',
        replace_existing=True
    )
    
    # Job de lembretes 24 horas - roda todos os dias às 10h
    scheduler.add_job(
        executar_lembretes_24h,
        trigger=CronTrigger(hour=10, minute=0),
        id='lembretes_24h',
        name='Lembretes 24 horas antes do culto',
        replace_existing=True
    )
    
    # Job de arquivamento automático - roda no dia 1 de cada mês às 2h da manhã
    scheduler.add_job(
        executar_arquivamento_escalas,
        trigger=CronTrigger(day=1, hour=2, minute=0),
        id='arquivamento_escalas',
        name='Arquivamento automático de escalas (3 meses)',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler iniciado com sucesso!")
    logger.info(f"Jobs agendados: {[job.name for job in scheduler.get_jobs()]}")
    
    # Registra shutdown ao encerrar
    atexit.register(shutdown_scheduler)


def shutdown_scheduler():
    """Desliga o scheduler graciosamente"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler desligado")


def get_scheduler_status():
    """Retorna status do scheduler e seus jobs"""
    jobs_info = []
    for job in scheduler.get_jobs():
        jobs_info.append({
            'id': job.id,
            'name': job.name,
            'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
            'trigger': str(job.trigger)
        })
    
    return {
        'running': scheduler.running,
        'jobs': jobs_info
    }


def executar_job_manualmente(job_id: str):
    """Executa um job manualmente (para testes)"""
    job = scheduler.get_job(job_id)
    if job:
        job.func()
        return True
    return False
