"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const THRESHOLD = 80; // distância (px) para disparar a atualização
const MAX_PULL = 130; // distância máxima visual
const RESISTANCE = 0.5; // "peso" do gesto (o dedo anda mais que o indicador)

/** Alguma área rolável com conteúdo acima? Então o gesto é uma rolagem normal, não "puxar". */
function hasScrolledAncestor(el: Element | null): boolean {
  let node: Element | null = el;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const scrollableY = style.overflowY === "auto" || style.overflowY === "scroll";
    if (scrollableY && node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return false;
}

/** Deve ignorar o gesto (janelas abertas, menus, campos de texto)? */
function shouldIgnore(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (
    target.closest(
      '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [data-radix-popper-content-wrapper], input, textarea, select'
    )
  ) {
    return true;
  }
  return hasScrolledAncestor(target);
}

/**
 * Puxar para atualizar (celular/tablet).
 * Puxe a tela de cima para baixo estando no topo; ao soltar depois do limite, a página recarrega.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    // Só em telas de toque
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const update = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return;
      if (window.scrollY > 0 || shouldIgnore(e.target)) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;

      // Subindo, ou a página já saiu do topo: não é "puxar"
      if (dy <= 0 || window.scrollY > 0) {
        if (pullRef.current !== 0) update(0);
        if (dy <= 0) startY.current = null;
        return;
      }

      if (e.cancelable) e.preventDefault(); // evita o "quique" nativo
      update(Math.min(dy * RESISTANCE, MAX_PULL));
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      startY.current = null;

      if (pullRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        update(THRESHOLD * 0.75);
        // pequena pausa para o usuário ver o indicador girando
        window.setTimeout(() => window.location.reload(), 350);
      } else {
        update(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const progress = Math.min(pull / THRESHOLD, 1);
  const visible = pull > 4 || refreshing;
  const ready = progress >= 1;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center lg:hidden"
      style={{ top: "calc(env(safe-area-inset-top) + 3.5rem)" }}
    >
      <div
        className={cn(
          "flex h-11 items-center gap-2 rounded-full border border-border/60 bg-card px-4 text-sm font-medium shadow-float",
          !visible && "opacity-0",
          !refreshing && "transition-opacity"
        )}
        style={{
          transform: `translateY(${Math.max(pull - 44, -44)}px)`,
          opacity: visible ? Math.max(progress, refreshing ? 1 : 0.25) : 0,
          transition: pull === 0 ? "transform 200ms ease, opacity 200ms ease" : "none",
        }}
      >
        {refreshing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Atualizando…</span>
          </>
        ) : (
          <>
            <ArrowDown
              className="h-4 w-4 text-primary transition-transform"
              style={{ transform: `rotate(${ready ? 180 : 0}deg)` }}
            />
            <span>{ready ? "Solte para atualizar" : "Puxe para atualizar"}</span>
          </>
        )}
      </div>
    </div>
  );
}
