"""
Auxiliar para QR Codes da escala pública (usa o reportlab, sem dependências extras)
"""
from typing import List, Optional, Tuple
from urllib.parse import urlparse

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, Table, TableStyle
from xml.sax.saxutils import escape as xml_escape

from app.core.config import settings


def _eh_endereco_local(url: str) -> bool:
    """localhost / 127.0.0.1 só funcionam no próprio computador, nunca no celular."""
    host = (urlparse(url).hostname or "").lower()
    return host in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or host.endswith(".localhost")


def resolver_base_url(base_url: Optional[str]) -> str:
    """
    Endereço do site usado dentro do QR Code (precisa abrir no celular de quem escaneia).

    Ordem de escolha:
    1. FRONTEND_URL, se estiver configurada com um endereço público (não localhost).
       É assim que o QR Code sempre aponta para o endereço do Cloudflare (ou do site final),
       mesmo se o PDF foi gerado abrindo o sistema por localhost.
    2. O endereço do navegador (base_url), se estiver na lista de origens permitidas (CORS).
    3. FRONTEND_URL (padrão: http://localhost:3000).
    """
    frontend = settings.FRONTEND_URL.strip().rstrip("/")
    if frontend and not _eh_endereco_local(frontend):
        return frontend

    permitidos = [o.rstrip("/") for o in settings.CORS_ORIGINS]
    if base_url:
        limpo = base_url.strip().rstrip("/")
        if limpo in permitidos:
            return limpo
    return frontend


def url_escala_igreja(base: str, igreja_id: int, mes: int, ano: int) -> str:
    return f"{base}/escala-publica/igreja/{igreja_id}?mes={mes}&ano={ano}"


def url_escala_distrito(base: str, distrito_id: int, mes: int, ano: int) -> str:
    return f"{base}/escala-publica/distrito/{distrito_id}?mes={mes}&ano={ano}"


def qr_drawing(url: str, tamanho) -> Drawing:
    """Desenho do QR Code em um quadrado de `tamanho` (pontos)."""
    widget = QrCodeWidget(url)
    x0, y0, x1, y1 = widget.getBounds()
    largura, altura = x1 - x0, y1 - y0
    desenho = Drawing(
        tamanho, tamanho,
        transform=[tamanho / largura, 0, 0, tamanho / altura, 0, 0],
    )
    desenho.add(widget)
    return desenho


def _estilos():
    base = getSampleStyleSheet()["Normal"]
    titulo = ParagraphStyle(
        "QrTitulo", parent=base, fontName="Helvetica-Bold", fontSize=10,
        leading=12, alignment=TA_CENTER, textColor=colors.HexColor("#1e40af"),
    )
    legenda = ParagraphStyle(
        "QrLegenda", parent=base, fontSize=8, leading=10,
        alignment=TA_CENTER, textColor=colors.HexColor("#475569"),
    )
    return titulo, legenda


def bloco_qr(url: str, titulo: str, legenda: str, tamanho=3 * cm) -> Table:
    """QR Code centralizado, com título e legenda."""
    est_titulo, est_legenda = _estilos()
    tabela = Table(
        [
            [Paragraph(xml_escape(titulo), est_titulo)],
            [qr_drawing(url, tamanho)],
            [Paragraph(xml_escape(legenda), est_legenda)],
        ],
        colWidths=[max(tamanho + 1 * cm, 7 * cm)],
        hAlign="CENTER",
    )
    tabela.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return tabela


def grade_qr_igrejas(
    igrejas: List[Tuple[str, str]], largura_util, colunas: int = 4, tamanho=3.2 * cm
) -> Table:
    """Grade com o QR Code de cada igreja. `igrejas` = [(nome, url), ...]."""
    est_titulo, est_legenda = _estilos()
    celulas = []
    for nome, url in igrejas:
        celulas.append([
            qr_drawing(url, tamanho),
            Paragraph(xml_escape(nome), est_titulo),
        ])
    # monta linhas de `colunas` células (cada célula = QR + nome em tabela interna)
    linhas, atual = [], []
    for qr, nome in celulas:
        interna = Table([[qr], [nome]], colWidths=[largura_util / colunas - 6])
        interna.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
        atual.append(interna)
        if len(atual) == colunas:
            linhas.append(atual)
            atual = []
    if atual:
        atual += [""] * (colunas - len(atual))
        linhas.append(atual)

    grade = Table(linhas, colWidths=[largura_util / colunas] * colunas)
    grade.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    return grade
