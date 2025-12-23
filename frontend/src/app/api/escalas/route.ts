import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export async function GET(request: NextRequest) {
  try {
    // Obter token do header Authorization
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const igrejaId = searchParams.get("igreja_id");
    const mes = searchParams.get("mes");
    const ano = searchParams.get("ano");

    let url = `${BACKEND_URL}/api/v1/escalas/`;
    const params = new URLSearchParams();
    
    if (igrejaId) params.append("igreja_id", igrejaId);
    if (mes) params.append("mes", mes);
    if (ano) params.append("ano", ano);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro do backend:", response.status, errorText);
      throw new Error(`Erro ao buscar escalas: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar escalas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar escalas" },
      { status: 500 }
    );
  }
}
