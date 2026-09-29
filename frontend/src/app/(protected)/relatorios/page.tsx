"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Calendar,
  Users,
  Star,
  Loader2,
  Printer
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

interface Escala {
  id: number;
  mes: number;
  ano: number;
  status: string;
  distrito_id: number;
  distrito?: { nome: string };
}

interface Distrito {
  id: number;
  nome: string;
}

interface Igreja {
  id: number;
  nome: string;
}

export default function RelatoriosPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
  const [selectedEscala, setSelectedEscala] = useState<string>("");
  const [selectedDistrito, setSelectedDistrito] = useState<string>("");
  const [selectedIgreja, setSelectedIgreja] = useState<string>("");
  
  // Date range for participações e avaliações
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  // Pastores e admins podem gerenciar relatórios
  const canManage = user?.tipo === "ADMIN" || user?.tipo === "PASTOR_DISTRITAL" || user?.tipo === "LIDER_DISTRITAL" || user?.tipo === "ASSOCIACAO";
  const isAdmin = user?.tipo === "ADMIN";

  // Carregar distritos
  useEffect(() => {
    const loadDistritos = async () => {
      try {
        const distritosRes = await api.get<{ items: Distrito[] }>("/api/v1/distritos/pesquisar?search=&limit=100");
        const distritosData = distritosRes.items || [];
        setDistritos(distritosData);
        
        // Selecionar distrito automaticamente para não-admins
        if (!isAdmin) {
          // Prioridade 1: distrito_id do usuário
          if (user?.distrito_id) {
            setSelectedDistrito(user.distrito_id.toString());
          } 
          // Prioridade 2: se só tem um distrito disponível, selecionar
          else if (distritosData.length === 1) {
            setSelectedDistrito(distritosData[0].id.toString());
          }
          // Prioridade 3: para pastores, buscar pelo primeiro distrito (único que tem acesso)
          else if (distritosData.length > 0 && (user?.tipo === "PASTOR_DISTRITAL" || user?.tipo === "LIDER_DISTRITAL")) {
            setSelectedDistrito(distritosData[0].id.toString());
          }
        }
      } catch (error) {
        console.error("Erro ao carregar distritos:", error);
      }
    };
    
    if (user) {
      loadDistritos();
    }
  }, [user, isAdmin]);

  // Carregar escalas quando distrito for selecionado
  useEffect(() => {
    const loadEscalas = async () => {
      if (!selectedDistrito) {
        setEscalas([]);
        return;
      }
      
      try {
        const escalasRes = await api.get<{ items: Escala[] }>(`/api/v1/escalas/?distrito_id=${selectedDistrito}`);
        setEscalas(escalasRes.items || []);
      } catch (error) {
        console.error("Erro ao carregar escalas:", error);
        setEscalas([]);
      }
    };
    loadEscalas();
  }, [selectedDistrito]);

  // Carregar igrejas quando distrito for selecionado
  useEffect(() => {
    const loadIgrejas = async () => {
      if (!selectedDistrito) {
        setIgrejas([]);
        setSelectedIgreja("");
        return;
      }
      
      try {
        const igrejasRes = await api.get<{ items: Igreja[] }>(`/api/v1/igrejas/?distrito_id=${selectedDistrito}`);
        setIgrejas(igrejasRes.items || []);
        setSelectedIgreja(""); // Resetar seleção de igreja ao mudar distrito
      } catch (error) {
        console.error("Erro ao carregar igrejas:", error);
        setIgrejas([]);
      }
    };
    loadIgrejas();
  }, [selectedDistrito]);

  const downloadFile = async (url: string, filename: string) => {
    try {
      console.log("Iniciando download:", url);
      const blob = await api.downloadBlob(url);
      console.log("Blob recebido:", blob.size, "bytes");
      
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
      
      toast({
        title: "Download concluído",
        description: `Arquivo ${filename} baixado com sucesso!`,
      });
    } catch (error: any) {
      console.error("Erro no download:", error);
      let errorMessage = "Erro ao gerar relatório";
      
      if (error.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.status === 403) {
        errorMessage = "Sem permissão para acessar este relatório.";
      } else if (error.status === 404) {
        errorMessage = "Escala não encontrada.";
      } else if (error.status === 500) {
        errorMessage = error.message || "Erro interno do servidor.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro no download",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Download Escala PDF
  const handleDownloadEscalaPDF = async () => {
    if (!selectedEscala) {
      toast({
        title: "Selecione uma escala",
        description: "Por favor, selecione uma escala para exportar.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading("escala-pdf");
    const escala = escalas.find(e => e.id.toString() === selectedEscala);
    const igreja = igrejas.find(i => i.id.toString() === selectedIgreja);
    
    // Construir URL com parâmetro opcional de igreja
    let url = `/api/v1/relatorios/escala/${selectedEscala}/pdf`;
    if (selectedIgreja && selectedIgreja !== "all") {
      url += `?igreja_id=${selectedIgreja}`;
    }
    
    // Construir nome do arquivo
    const igrejaSlug = igreja ? `_${igreja.nome.replace(/\s+/g, '_')}` : '';
    const filename = `escala_${escala?.mes}_${escala?.ano}${igrejaSlug}.pdf`;
    
    await downloadFile(url, filename);
    setLoading(null);
  };

  // Download Escala Excel
  const handleDownloadEscalaExcel = async () => {
    if (!selectedEscala) {
      toast({
        title: "Selecione uma escala",
        description: "Por favor, selecione uma escala para exportar.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading("escala-excel");
    const escala = escalas.find(e => e.id.toString() === selectedEscala);
    const igreja = igrejas.find(i => i.id.toString() === selectedIgreja);
    
    // Construir URL com parâmetro opcional de igreja
    let url = `/api/v1/relatorios/escala/${selectedEscala}/excel`;
    if (selectedIgreja && selectedIgreja !== "all") {
      url += `?igreja_id=${selectedIgreja}`;
    }
    
    // Construir nome do arquivo
    const igrejaSlug = igreja ? `_${igreja.nome.replace(/\s+/g, '_')}` : '';
    const filename = `escala_${escala?.mes}_${escala?.ano}${igrejaSlug}.xlsx`;
    
    await downloadFile(url, filename);
    setLoading(null);
  };

  // Imprimir Escala PDF (abre em nova aba para impressão)
  const handlePrintEscalaPDF = async () => {
    if (!selectedEscala) {
      toast({
        title: "Selecione uma escala",
        description: "Por favor, selecione uma escala para imprimir.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading("escala-print");
    
    try {
      // Construir URL com parâmetro opcional de igreja
      let url = `/api/v1/relatorios/escala/${selectedEscala}/pdf`;
      if (selectedIgreja && selectedIgreja !== "all") {
        url += `?igreja_id=${selectedIgreja}`;
      }
      
      const blob = await api.downloadBlob(url);
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Abrir em nova aba para impressão
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast({
        title: "PDF aberto para impressão",
        description: "Use Ctrl+P ou o menu do navegador para imprimir.",
      });
    } catch (error: unknown) {
      console.error("Erro ao abrir PDF:", error);
      toast({
        title: "Erro ao abrir PDF",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
    
    setLoading(null);
  };

  // Download Participações PDF
  const handleDownloadParticipacoesPDF = async () => {
    if (!selectedDistrito) {
      toast({
        title: "Selecione um distrito",
        description: "Por favor, selecione um distrito para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading("participacoes-pdf");
    const params = new URLSearchParams({
      data_inicio: format(dataInicio, "yyyy-MM-dd"),
      data_fim: format(dataFim, "yyyy-MM-dd"),
      distrito_id: selectedDistrito,
    });
    
    const filename = `participacoes_${format(dataInicio, "yyyy-MM")}_${format(dataFim, "yyyy-MM")}.pdf`;
    await downloadFile(`/api/v1/relatorios/participacoes/pdf?${params}`, filename);
    setLoading(null);
  };

  // Download Participações Excel
  const handleDownloadParticipacoesExcel = async () => {
    if (!selectedDistrito) {
      toast({
        title: "Selecione um distrito",
        description: "Por favor, selecione um distrito para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading("participacoes-excel");
    const params = new URLSearchParams({
      data_inicio: format(dataInicio, "yyyy-MM-dd"),
      data_fim: format(dataFim, "yyyy-MM-dd"),
      distrito_id: selectedDistrito,
    });
    
    const filename = `participacoes_${format(dataInicio, "yyyy-MM")}_${format(dataFim, "yyyy-MM")}.xlsx`;
    await downloadFile(`/api/v1/relatorios/participacoes/excel?${params}`, filename);
    setLoading(null);
  };

  // Download Avaliações PDF
  const handleDownloadAvaliacoesPDF = async () => {
    if (!selectedDistrito) {
      toast({
        title: "Selecione um distrito",
        description: "Por favor, selecione um distrito para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading("avaliacoes-pdf");
    const params = new URLSearchParams({
      data_inicio: format(dataInicio, "yyyy-MM-dd"),
      data_fim: format(dataFim, "yyyy-MM-dd"),
      distrito_id: selectedDistrito,
    });
    
    const filename = `avaliacoes_${format(dataInicio, "yyyy-MM")}_${format(dataFim, "yyyy-MM")}.pdf`;
    await downloadFile(`/api/v1/relatorios/avaliacoes/pdf?${params}`, filename);
    setLoading(null);
  };

  // Download Avaliações Excel
  const handleDownloadAvaliacoesExcel = async () => {
    if (!selectedDistrito) {
      toast({
        title: "Selecione um distrito",
        description: "Por favor, selecione um distrito para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading("avaliacoes-excel");
    const params = new URLSearchParams({
      data_inicio: format(dataInicio, "yyyy-MM-dd"),
      data_fim: format(dataFim, "yyyy-MM-dd"),
      distrito_id: selectedDistrito,
    });
    
    const filename = `avaliacoes_${format(dataInicio, "yyyy-MM")}_${format(dataFim, "yyyy-MM")}.xlsx`;
    await downloadFile(`/api/v1/relatorios/avaliacoes/excel?${params}`, filename);
    setLoading(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Exporte escalas, participações e avaliações em PDF ou Excel
        </p>
      </div>

      <Tabs defaultValue="escalas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="escalas" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Escalas
          </TabsTrigger>
          <TabsTrigger value="participacoes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Participações
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Avaliações
          </TabsTrigger>
        </TabsList>

        {/* Tab Escalas */}
        <TabsContent value="escalas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Exportar Escala
              </CardTitle>
              <CardDescription>
                Selecione um distrito e uma escala para exportar em PDF ou Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seletor de Distrito */}
              <div className="space-y-2">
                <Label>Distrito</Label>
                <Select 
                  value={selectedDistrito} 
                  onValueChange={setSelectedDistrito}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um distrito" />
                  </SelectTrigger>
                  <SelectContent>
                    {distritos.map((distrito) => (
                      <SelectItem key={distrito.id} value={distrito.id.toString()}>
                        {distrito.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Escala */}
              <div className="space-y-2">
                <Label>Escala</Label>
                <Select 
                  value={selectedEscala} 
                  onValueChange={setSelectedEscala}
                  disabled={!selectedDistrito}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedDistrito ? "Selecione uma escala" : "Selecione um distrito primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {escalas.map((escala) => (
                      <SelectItem key={escala.id} value={escala.id.toString()}>
                        {format(new Date(escala.ano, escala.mes - 1), "MMMM yyyy", { locale: ptBR })} 
                        {` (${escala.status})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Igreja (opcional) */}
              <div className="space-y-2">
                <Label>Igreja (opcional)</Label>
                <Select 
                  value={selectedIgreja} 
                  onValueChange={setSelectedIgreja}
                  disabled={!selectedDistrito}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as igrejas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as igrejas</SelectItem>
                    {igrejas.map((igreja) => (
                      <SelectItem key={igreja.id} value={igreja.id.toString()}>
                        {igreja.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Selecione uma igreja específica para gerar um relatório individual em uma página
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  onClick={handleDownloadEscalaPDF}
                  disabled={!selectedEscala || loading === "escala-pdf"}
                  className="flex items-center gap-2"
                >
                  {loading === "escala-pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Baixar PDF
                </Button>
                <Button
                  onClick={handlePrintEscalaPDF}
                  disabled={!selectedEscala || loading === "escala-print"}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  {loading === "escala-print" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                  Imprimir
                </Button>
                <Button
                  onClick={handleDownloadEscalaExcel}
                  disabled={!selectedEscala || loading === "escala-excel"}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {loading === "escala-excel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Baixar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Participações */}
        <TabsContent value="participacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relatório de Participações
              </CardTitle>
              <CardDescription>
                Estatísticas de participação de pregadores e cantores por período
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataInicio && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={dataInicio}
                        onSelect={(date) => date && setDataInicio(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataFim && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={dataFim}
                        onSelect={(date) => date && setDataFim(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Distrito</Label>
                  <Select value={selectedDistrito} onValueChange={setSelectedDistrito} disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um distrito" />
                    </SelectTrigger>
                    <SelectContent>
                      {distritos.map((distrito) => (
                        <SelectItem key={distrito.id} value={distrito.id.toString()}>
                          {distrito.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  onClick={handleDownloadParticipacoesPDF}
                  disabled={loading === "participacoes-pdf"}
                  className="flex items-center gap-2"
                >
                  {loading === "participacoes-pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Baixar PDF
                </Button>
                <Button
                  onClick={handleDownloadParticipacoesExcel}
                  disabled={loading === "participacoes-excel"}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {loading === "participacoes-excel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Baixar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Avaliações */}
        <TabsContent value="avaliacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Relatório de Avaliações
              </CardTitle>
              <CardDescription>
                Avaliações de pregadores e cantores com médias e comentários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataInicio && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={dataInicio}
                        onSelect={(date) => date && setDataInicio(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataFim && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={dataFim}
                        onSelect={(date) => date && setDataFim(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Distrito</Label>
                  <Select value={selectedDistrito} onValueChange={setSelectedDistrito} disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um distrito" />
                    </SelectTrigger>
                    <SelectContent>
                      {distritos.map((distrito) => (
                        <SelectItem key={distrito.id} value={distrito.id.toString()}>
                          {distrito.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  onClick={handleDownloadAvaliacoesPDF}
                  disabled={loading === "avaliacoes-pdf"}
                  className="flex items-center gap-2"
                >
                  {loading === "avaliacoes-pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Baixar PDF
                </Button>
                <Button
                  onClick={handleDownloadAvaliacoesExcel}
                  disabled={loading === "avaliacoes-excel"}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {loading === "avaliacoes-excel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Baixar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
