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

    const response = await fetch(`${BACKEND_URL}/api/v1/avaliacoes/pendentes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao buscar avaliações pendentes");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar avaliações pendentes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar avaliações pendentes" },
      { status: 500 }
    );
  }
}
