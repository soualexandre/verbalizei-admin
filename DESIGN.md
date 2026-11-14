---
name: Verbalizei Admin
description: Painel interno do Verbalizei; neutro e compacto, com azul (ação) e verde (progresso) só nos detalhes.
colors:
  primary: "#004ba6"
  primary-hover: "#003c86"
  brand: "#0063de"
  brand-ink: "#004ba6"
  brand-50: "#eef4fd"
  brand-100: "#dce8fb"
  green: "#81a641"
  green-ink: "#4f6e22"
  green-deep: "#3f6b16"
  lime-600: "#a8b524"
  lime-ink: "#5e6b0c"
  success-soft: "#eef4e2"
  warning-soft: "#f4f6d4"
  background: "#f6f7f9"
  foreground: "#101828"
  card: "#ffffff"
  muted: "#f2f4f7"
  muted-foreground: "#5b6475"
  border: "#e6e8ec"
  input: "#dfe2e7"
  destructive: "#d93a3a"
  chart-1: "#004ba6"
  chart-2: "#81a641"
  chart-3: "#7fb0ee"
  chart-4: "#3f6b16"
  chart-5: "#a0a7b4"
  heat-pos: "#81a641"
  heat-neg: "#7fb0ee"
  heat-mid: "#f2f4f7"
typography:
  display:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  stat:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "tnum"
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.35
  caption:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.35
rounded:
  md: "6px"
  lg: "8px"
  card: "12px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
  grid-gap: "16px"
  block-gap: "24px"
  page-max: "1280px"
---

# Design System: Verbalizei Admin

## Overview

**Direção (14/11/2026, pedido do usuário): "Neutro com detalhe".** Substitui "O extrato verde" (25/10/2026). O admin é uma ferramenta de trabalho: cinzas frios tingidos do marinho da marca fazem a interface, tudo compacto, e a cor aparece só onde diz algo — **azul** é ação e onde você está (botão, menu ativo, foco, link, selo padrão), **verde** é progresso (alta, sucesso, "no limite"), **lima** é atenção, **vermelho** só erro ou estouro. Referência: painéis de SaaS no Dribbble/Behance (Linear, Stripe, Vercel): densidade alta, hierarquia por peso e espaço, não por tamanho.

Toda tela lê de cima para baixo: **título** (22 px, uma linha de contexto, ações à direita) → **faixa de totais** → **seções** (gráficos e tabelas em cartões brancos) → **insights**. As explicações ficam num "i" ao lado do título da seção (`InfoTip`), não em texto corrido.

## Colors

- **Fundo** `#f6f7f9`, **cartão** branco, **borda** `#e6e8ec`, **texto** `#101828`, **apoio** `#5b6475` (5,9:1 no branco).
- **Azul** `#004ba6` (primary): botão principal, link, selo padrão (`brand-50` + `brand-ink`), item ativo do menu (`brand-50`, ícone `brand`), foco (`#0063de`), linha selecionada.
- **Verde** `#4f6e22` sobre `#eef4e2`: variação boa, "no limite", sucesso. Ponto de insight "bom sinal" em `#81a641`.
- **Lima** `#5e6b0c` sobre `#f4f6d4`: queda, "perto da cota", aviso. Ícone de aviso em `lime-600`.
- **Vermelho** `#d93a3a`: erro, ação destrutiva, cota ou orçamento estourado.
- **Gráficos** (validate_palette da skill dataviz, 14/11/2026, todas as checagens passam): chart-1 azul (cenários), chart-2 verde (gravações), chart-3 azul-claro (micro-treinos), chart-4 verde-escuro (jogos), chart-5 cinza (outros). chart-2/3 ficam abaixo de 3:1 sobre branco: todo gráfico leva legenda nomeada e tooltip. No painel de custos a cor segue o provedor (OpenRouter azul, Google verde, Recall azul-claro, Deepgram verde-escuro).

**Rule:** nada de campo de cor cheio, gradiente ou sombra decorativa. Cor é significado e é pouca.

## Typography

Raleway só no h1 e nos números (700, algarismos tabulares); o resto em DM Sans.
- h1 22 px · número do total 22 px · título de seção 15 px semibold · título de cartão 14 px semibold · texto 13 px · rótulo 12 px · legenda, cabeçalho de tabela e selo 11 px.

## Layout

- Menu lateral branco de 224 px com borda; itens de 32 px, ícone 18 px, texto 13 px; grupos em rótulo de 10,5 px maiúsculo. Sininho ao lado da marca (no celular, na barra de 48 px).
- Conteúdo até 1280 px, respiro 16/24/32 px, 24 px entre blocos, 16 px de vão nas grades.
- **Faixa de totais (`HeroStats`)**: um cartão só, células separadas por linha de 1 px; rótulo (até 2 linhas) → número → variação → nota de 1 linha. Sem destaque de cor. Quando subir é ruim (custo), `trendTone` pinta a variação de atenção sem inverter a seta.
- Grades com gráfico usam `grid-cols-1` explícito no celular (a coluna implícita encolhe a zero com `min-w-0`).

## Components

- **Cartão:** branco, canto 12 px, borda 1 px, padding 16 px, sem sombra.
- **Botão:** 36 px (sm 32), canto 8 px, 13 px medium; principal azul chapado sem sombra; contorno branco com hover cinza; fantasma cinza.
- **Campo e select:** 36 px, canto 8 px, fundo branco. **Abas:** trilho cinza de 32 px, aba de 28 px.
- **Tabela:** cabeçalho cinza de 32 px, 11 px; células 8 px acima e abaixo, 13 px.
- **Selo:** pílula de 11 px; padrão azul claro, sucesso verde, aviso lima, destrutivo vermelho a 10%.
- **Seção:** título 15 px + "i" com a explicação (`InfoTip`, tooltip escuro de 12 px, acessível por teclado).
- **Insights:** cartão com frases de 13 px e ponto de 6 px na cor do que dizem.
- **Sininho (`NotificationBell`):** ícone de 18 px, contador azul (vermelho se houver aviso crítico novo); lista com avisos de custo e empresas sem resposta; o que foi visto fica guardado no navegador e um aviso que piora volta como novo.
- **Medidor de cota:** barra de 6 px, azul no limite, lima perto, vermelho estourado, com "usado de cota · %".
- **Estado de erro (`ErrorState`):** um só para o admin todo; título do que não carregou, detalhe técnico e "Tentar de novo".

## Do's and Don'ts

- **Do** manter o texto curto: uma linha de contexto no topo, explicações no "i".
- **Do** usar azul só para ação e seleção, e verde só para progresso.
- **Don't** voltar com número de 2–2,75 rem, canto de 22 px, cartão verde em gradiente ou sombra colorida.
- **Don't** usar cor como única pista em gráfico; **don't** usar laranja.
