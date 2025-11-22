"""
Service para geração de QR Codes para avaliação de pregações
"""
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SquareGradiantColorMask
from PIL import Image, ImageDraw, ImageFont
import io
from typing import Optional
import base64


class QRCodeService:
    """Service para gerar QR Codes de avaliação"""

    @staticmethod
    def gerar_qrcode(
        url: str,
        tamanho: int = 300,
        incluir_logo: bool = False,
        logo_path: Optional[str] = None,
        cor: str = "#000000",
        fundo: str = "#FFFFFF"
    ) -> bytes:
        """
        Gera um QR Code com a URL especificada

        Args:
            url: URL que o QR Code deve direcionar
            tamanho: Tamanho do QR Code em pixels (padrão: 300)
            incluir_logo: Se deve incluir logo no centro (padrão: False)
            logo_path: Caminho para o arquivo de logo (se incluir_logo=True)
            cor: Cor do QR Code em hex (padrão: preto)
            fundo: Cor de fundo em hex (padrão: branco)

        Returns:
            bytes: Imagem PNG do QR Code
        """
        # Criar QR Code
        qr = qrcode.QRCode(
            version=1,  # Tamanho do QR Code (1-40)
            error_correction=qrcode.constants.ERROR_CORRECT_H,  # Alta correção de erro
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)

        # Gerar imagem
        img = qr.make_image(
            fill_color=cor,
            back_color=fundo,
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer()
        )

        # Redimensionar para o tamanho desejado
        img = img.resize((tamanho, tamanho), Image.Resampling.LANCZOS)

        # Adicionar logo se solicitado
        if incluir_logo and logo_path:
            try:
                logo = Image.open(logo_path)

                # Calcular tamanho do logo (30% do QR Code)
                logo_size = tamanho // 3
                logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

                # Criar máscara circular para o logo
                mask = Image.new('L', (logo_size, logo_size), 0)
                draw = ImageDraw.Draw(mask)
                draw.ellipse((0, 0, logo_size, logo_size), fill=255)

                # Adicionar fundo branco ao logo
                logo_bg = Image.new('RGB', (logo_size, logo_size), fundo)
                logo_bg.paste(logo, (0, 0), mask if logo.mode == 'RGBA' else None)

                # Posicionar logo no centro
                pos = ((tamanho - logo_size) // 2, (tamanho - logo_size) // 2)
                img.paste(logo_bg, pos)

            except Exception as e:
                # Se falhar ao adicionar logo, continuar sem ele
                pass

        # Converter para bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        return img_bytes.getvalue()

    @staticmethod
    def gerar_qrcode_base64(
        url: str,
        tamanho: int = 300,
        incluir_logo: bool = False,
        logo_path: Optional[str] = None
    ) -> str:
        """
        Gera QR Code e retorna como string base64

        Útil para embedding direto em HTML/emails
        """
        img_bytes = QRCodeService.gerar_qrcode(
            url=url,
            tamanho=tamanho,
            incluir_logo=incluir_logo,
            logo_path=logo_path
        )

        # Converter para base64
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        return f"data:image/png;base64,{img_base64}"

    @staticmethod
    def gerar_url_avaliacao_culto(
        base_url: str,
        pregacao_id: str
    ) -> str:
        """
        Gera URL para avaliação de um culto específico

        Args:
            base_url: URL base da aplicação (ex: https://app.exemplo.com)
            pregacao_id: ID da pregação

        Returns:
            str: URL completa para o formulário de avaliação
        """
        return f"{base_url}/avaliar/{pregacao_id}"

    @staticmethod
    def gerar_url_avaliacao_pregador(
        base_url: str,
        pregacao_id: str,
        pregador_id: str
    ) -> str:
        """
        Gera URL para avaliação de um pregador específico

        Args:
            base_url: URL base da aplicação
            pregacao_id: ID da pregação
            pregador_id: ID do pregador

        Returns:
            str: URL completa para o formulário de avaliação do pregador
        """
        return f"{base_url}/avaliar/{pregacao_id}/pregador/{pregador_id}"

    @staticmethod
    def gerar_qrcode_culto(
        base_url: str,
        pregacao_id: str,
        tamanho: int = 300,
        incluir_logo: bool = False,
        logo_path: Optional[str] = None
    ) -> bytes:
        """
        Gera QR Code para avaliação de culto (único para todos os pregadores)

        Args:
            base_url: URL base da aplicação
            pregacao_id: ID da pregação
            tamanho: Tamanho do QR Code
            incluir_logo: Se deve incluir logo
            logo_path: Caminho do logo

        Returns:
            bytes: Imagem PNG do QR Code
        """
        url = QRCodeService.gerar_url_avaliacao_culto(base_url, pregacao_id)
        return QRCodeService.gerar_qrcode(
            url=url,
            tamanho=tamanho,
            incluir_logo=incluir_logo,
            logo_path=logo_path
        )

    @staticmethod
    def gerar_qrcode_pregador(
        base_url: str,
        pregacao_id: str,
        pregador_id: str,
        tamanho: int = 300,
        incluir_logo: bool = False,
        logo_path: Optional[str] = None
    ) -> bytes:
        """
        Gera QR Code para avaliação de pregador específico

        Args:
            base_url: URL base da aplicação
            pregacao_id: ID da pregação
            pregador_id: ID do pregador
            tamanho: Tamanho do QR Code
            incluir_logo: Se deve incluir logo
            logo_path: Caminho do logo

        Returns:
            bytes: Imagem PNG do QR Code
        """
        url = QRCodeService.gerar_url_avaliacao_pregador(
            base_url, pregacao_id, pregador_id
        )
        return QRCodeService.gerar_qrcode(
            url=url,
            tamanho=tamanho,
            incluir_logo=incluir_logo,
            logo_path=logo_path
        )

    @staticmethod
    def gerar_qrcodes_multiplos(
        base_url: str,
        pregacoes: list,
        modo: str = "unico_por_culto",
        tamanho: int = 300,
        incluir_logo: bool = False,
        logo_path: Optional[str] = None
    ) -> dict:
        """
        Gera múltiplos QR Codes de uma vez

        Args:
            base_url: URL base da aplicação
            pregacoes: Lista de dicionários com pregação_id e pregador_id
            modo: "unico_por_culto" ou "por_pregador"
            tamanho: Tamanho dos QR Codes
            incluir_logo: Se deve incluir logo
            logo_path: Caminho do logo

        Returns:
            dict: Dicionário com pregacao_id como chave e QR Code (bytes) como valor
        """
        qrcodes = {}

        for pregacao in pregacoes:
            pregacao_id = pregacao['pregacao_id']
            pregador_id = pregacao.get('pregador_id')

            if modo == "unico_por_culto":
                qr_code = QRCodeService.gerar_qrcode_culto(
                    base_url=base_url,
                    pregacao_id=pregacao_id,
                    tamanho=tamanho,
                    incluir_logo=incluir_logo,
                    logo_path=logo_path
                )
                qrcodes[pregacao_id] = qr_code

            elif modo == "por_pregador" and pregador_id:
                qr_code = QRCodeService.gerar_qrcode_pregador(
                    base_url=base_url,
                    pregacao_id=pregacao_id,
                    pregador_id=pregador_id,
                    tamanho=tamanho,
                    incluir_logo=incluir_logo,
                    logo_path=logo_path
                )
                key = f"{pregacao_id}_{pregador_id}"
                qrcodes[key] = qr_code

        return qrcodes
