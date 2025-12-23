import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/v1/avaliacoes/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    return NextResponse.json(
      { error: "Erro ao criar avaliação" },
      { status: 500 }
    );
  }
}

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

    const response = await fetch(`${BACKEND_URL}/api/v1/avaliacoes/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao buscar avaliações");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar avaliações" },
      { status: 500 }
    );
  }
}
