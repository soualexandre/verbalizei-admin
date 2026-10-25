---
name: Verbalizei Admin
description: Painel interno do Verbalizei; cada tela abre numa faixa azul com os totais, depois gráficos, depois o que fazer.
colors:
  brand: "#0063de"
  brand-ink: "#004ba6"
  brand-deep: "#003f8f"
  brand-50: "#eef4fd"
  brand-100: "#dce8fb"
  green: "#81a641"
  green-600: "#5f8530"
  green-ink: "#4f6e22"
  green-50: "#f1f6e6"
  lime: "#cfdc3e"
  lime-600: "#a8b524"
  lime-ink: "#5e6b0c"
  lime-50: "#f6f8d9"
  background: "#f5f8fc"
  foreground: "#0b1b33"
  card: "#ffffff"
  muted: "#eef2f7"
  muted-foreground: "#586a82"
  border: "#e2e8f1"
  input: "#d9e1ec"
  destructive: "#d93a3a"
  chart-1: "#0063de"
  chart-2: "#7fb0ee"
  chart-3: "#5f8530"
  chart-4: "#a8b524"
  chart-5: "#9aa8bb"
  heat-pos: "#7fb0ee"
  heat-neg: "#d9de8a"
  heat-mid: "#eef2f7"
typography:
  display:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  stat:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: "-0.005em"
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.375
rounded:
  chip: "8px"
  xl: "12px"
  2xl: "16px"
  card: "22px"
  hero: "28px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "32px"
  grid-gap: "16px"
  section-gap: "48px"
  page-max: "1280px"
components:
  page-hero:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.card}"
    rounded: "{rounded.hero}"
    padding: "32px"
  hero-stat:
    backgroundColor: "rgb(0 40 100 / 0.32)"
    textColor: "{colors.card}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  trend-up:
    backgroundColor: "{colors.green}"
    textColor: "#14200a"
    rounded: "{rounded.full}"
    padding: "2px 6px"
  trend-down:
    backgroundColor: "{colors.lime}"
    textColor: "#2f3604"
    rounded: "{rounded.full}"
    padding: "2px 6px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "24px"
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "#0a3d8f"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.xl}"
    height: "40px"
  button-hero-primary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.xl}"
    height: "40px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    height: "40px"
  nav-item-active:
    backgroundColor: "{colors.brand-50}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    height: "44px"
---

# Design System: Verbalizei Admin

## Overview

**Creative North Star: "O placar da marca"**

O admin veste a identidade oficial do Verbalizei (manual de marca, out/2026), a mesma do verbalizei_web: azul, verde, lima e branco, Raleway nos títulos e DM Sans no texto. A direção foi **fixada pelo usuário em 25/10/2026**, não sorteada: ele pinou a identidade e, numa pergunta estruturada, escolheu "faixa de cor no topo" em "todas as telas". Por isso a rolagem de conceito da skill (FORM / seed key) não rodou; esta decisão ocupa o lugar dela.

Toda tela lê de cima para baixo na mesma ordem: **faixa azul** (título, ações, totalizadores) → **gráficos e conteúdo principal** em cartões brancos → **insights**, frases que dizem o que o número significa e o que fazer. A faixa é o único campo de cor cheio da tela; abaixo dela, o branco carrega os dados e a cor da marca aparece só nos dados.

Densidade de painel de trabalho, sem enfeite: números grandes na faixa, gráficos de 220 px, frases curtas. O produto pede conclusão, não planilha (PRODUCT.md), e o layout serve a isso.

**Key Characteristics:**
- Uma faixa azul por tela, com um fio de lima na base.
- Cor por significado: azul = uso/ação, verde = melhorou, lima = atenção, vermelho só erro.
- Cartões brancos de canto largo, quase sem sombra.
- Números em Raleway 800 com algarismos tabulares.
- Um componente para cada estado: `ErrorState` para erro, `HeroStatsSkeleton` para os totais carregando.

## Colors

Quatro cores de marca sobre um fundo azulado quase branco; nenhuma cor fora da identidade.

### Primary
- **Azul Verbalizei** (brand): a faixa do topo, botão principal, item ativo do menu, foco, série principal dos gráficos. É "uso" e "ação".
- **Azul tinta** (brand-ink): texto azul sobre fundo claro (botão branco na faixa, aba ativa na faixa, ícone do erro).
- **Azul fundo** (brand-deep): só no fim do gradiente da faixa (135°, brand até 55%, depois brand-deep).
- **Azul névoa** (brand-50 / brand-100): pílula do item ativo, avatar, círculo do ícone de erro.

### Secondary
- **Verde folha** (green): "melhorou / bom sinal". Pílula de alta nos totalizadores, ponto verde nos insights.
- **Verde musgo** (green-600 / green-ink): série de treinos curtos nos gráficos; texto de sucesso.

### Tertiary
- **Lima** (lime): o acento de energia. Fio de 4 px na base da faixa, pílula de queda na faixa, seleção de texto.
- **Lima oliva** (lime-600): "atenção" sobre branco (ponto de insight, série de jogos); lime puro não aparece sobre branco.
- **Lima tinta** (lime-ink): texto de aviso (token `warning`).

### Neutral
- **Névoa de papel** (background): fundo da página.
- **Branco** (card): cartões, menu lateral, popovers.
- **Tinta noturna** (foreground): texto principal e a linha de usuários nos gráficos.
- **Ardósia** (muted-foreground): texto de apoio, eixos dos gráficos, rótulos de grupo do menu.
- **Linha** (border / input): bordas de cartão e campo, grade horizontal dos gráficos.
- **Vermelho erro** (destructive): só ação destrutiva e mensagem de validação.

### Gráficos
Paleta validada pelo `validate_palette` da skill dataviz (25/10/2026): chart-1 cenários, chart-2 gravações, chart-3 treinos curtos, chart-4 jogos, chart-5 neutro. chart-2 e chart-4 ficam abaixo de 3:1 sobre branco; isso é coberto por **legenda com nome e valor** (`KindLegend`) e tooltip em todo gráfico, nunca por cor sozinha. Em barras de uma série, o pico vai em chart-1 e o resto em chart-2. Mapa de calor divergente: heat-neg (abaixo da média) ← heat-mid → heat-pos (acima).

### Named Rules
**The Meaning Rule.** Cor diz significado, igual em todas as telas: azul = marca/uso/ação; verde = melhorou; lima = atenção; branco translúcido = estável. Uma queda nunca é vermelha.

**The One Spark Rule.** O lima puro aparece uma vez por tela como acento: o fio na base da faixa. Fora dele, só a pílula de queda na faixa.

**The No Orange Rule.** A marca não tem laranja. Vermelho existe só para erro e ação destrutiva.

## Typography

**Display Font:** Raleway (600/700/800, via next/font; reserva DM Sans)
**Body Font:** DM Sans
**Label/Mono Font:** Geist Mono, só onde há código

**Character:** Raleway extra-negrito dá aos títulos e números a voz da marca; DM Sans deixa o texto e as tabelas calmos e legíveis.

### Hierarchy
- **Display** (800, 1.75rem no celular / 2rem, leading-tight): o `h1` da faixa. Um por tela.
- **Stat** (800, 1.5rem no celular / 2rem, leading 1, tabular): número do totalizador.
- **Headline** (700, 1.25rem): título de `Section`.
- **Title** (DM Sans 700): título de cartão.
- **Body** (400, 15px, leading-snug): insights e descrição da faixa; 14px (text-sm) em descrições de seção.
- **Label** (500, 13px): rótulo do totalizador; notas em 12px; pílula de variação em 11px bold.

### Named Rules
**The Raleway For Headings Rule.** h1, h2 e h3 são Raleway (global em globals.css); tudo o mais é DM Sans. Número que importa usa `font-display` + `tabular-nums`.

## Layout

- **Casca:** menu lateral fixo de 256 px a partir de `md`; no celular, barra de 56 px com a marca e o botão de menu, que abre uma gaveta de 288 px (máx. 85vw) com véu azul-tinta a 45%.
- **Área de conteúdo:** máx. 1280 px (max-w-7xl), centrada; respiro 16 / 24 / 32 px (celular / sm / lg); 24 px entre blocos de topo.
- **Ordem de toda tela:** `PageHero` → `Section`s de gráficos (grade de 2 colunas em `lg`, 16 px de vão) → `Section` de insights. Entre seções, 48 px (space-y-12).
- **Totalizadores:** 2 colunas no celular, até 3/4/5/6 colunas na tela grande (`cols`).
- **Faixa:** título à esquerda (máx. 42rem), ações à direita em `lg`; no celular as ações descem e as abas rolam de lado em vez de vazar.

### Named Rules
**The Hero First Rule.** Toda tela abre em `PageHero`. Os totais moram dentro dela; não há linha de KPI em cartões brancos abaixo.

## Elevation & Depth

Plano por padrão; profundidade vem da faixa azul contra o fundo claro. Os cartões de conteúdo usam `shadow-none` com borda de 1 px.

### Shadow Vocabulary
- **Brilho da faixa** (`0 12px 32px -18px rgb(0 63 143 / 0.55)`): só no `PageHero`.
- **Botão principal** (`0 6px 16px -8px rgba(12,76,174,0.6)`): sombra azul curta sob o botão cheio.
- **Flutuante** (`shadow-md` / `shadow-xl`): tooltips de gráfico e a gaveta do celular.

## Shapes

Cantos generosos, em escala nomeada: chip 8 px, botões/campos/abas/itens de menu 12 px, totalizadores 16 px, cartões 22 px, faixa 28 px. Pílulas (variação, contagem do grupo no menu) e pontos de insight são redondos.

## Components

### Faixa (PageHero)
- Gradiente azul de marca, texto branco, canto de 28 px, fio de lima de 4 px na base, padding 20/24 px no celular e 32 px no desktop.
- Texto pequeno em white/90 (≈4,7:1 sobre o azul); nunca abaixo disso.
- **Controles dentro da faixa** (`.hero-actions`): abas em trilho branco a 14% com a ativa em branco cheio e texto brand-ink; botões de contorno e selects em branco a 12% com borda branca a 35%; campo de texto branco; botão principal invertido (branco, texto brand-ink).

### Totalizador (HeroStat)
- Azul mais fundo translúcido (`rgb(0 40 100 / 0.32)`, anel branco a 10%), canto 16 px; o branco passa de 8:1 ali.
- Ordem fixa: rótulo (reserva duas linhas, `min-h-[2lh]`, para alinhar os números) → número em Raleway 800 → pílula de variação **sempre na linha de baixo** (verde sobe, lima cai, branco a 12% estável, com seta) → nota curta (1 linha no celular, 2 no desktop).
- A explicação do número vai no `help` (atributo title), não em texto extra.
- Carregando: `HeroStatsSkeleton` com o mesmo `count`, blocos de 108 px em branco a 12%.

### Seção (Section)
- Título Raleway 700 20 px, descrição em ardósia 14 px, `aside` opcional à direita; 16 px até o conteúdo.

### Cartões
- Branco, canto 22 px, borda 1 px, sem sombra, padding 24 px, 16 px entre itens. Gráficos ficam um por cartão, com título, frase que lê o gráfico e legenda.

### Gráficos
- Recharts, 220 px de altura, só grade horizontal, eixos sem linha em 12 px ardósia, sem animação. Tooltip em cartão branco de canto 8 px com ponto de cor + rótulo + valor. Toda série tem nome na legenda.

### Insights (InsightList)
- Frases de 15 px, cada uma com ponto de 8 px no tom do que diz: brand, green, lime-600, chart-5 neutro. Uma ou duas colunas.

### Botões
- **Forma:** canto 12 px, altura 40 px (sm 36, lg 44), semibold, encolhe a 98% ao clicar, anel de foco de 3 px.
- **Principal:** azul cheio, bold, hover #0a3d8f. **Contorno:** branco com texto ardósia, hover escurece a borda. **Destrutivo:** vermelho, só para excluir.

### Campos e abas
- Campo: 40 px, canto 12 px, borda `input`. Abas: trilho `muted` de 40 px, aba ativa branca e semibold; com muitas opções, rolam de lado.

### Navegação
- Três grupos na ordem Métricas → Pessoas → Conteúdo, rótulo de grupo em 11px maiúsculo ardósia. Só o grupo da tela atual fica aberto (não fecha); os outros abrem por clique e lembram no navegador, mostrando a contagem quando fechados.
- Item: 44 px, canto 12 px, ícone Phosphor 22 px. Ativo: pílula brand-50, texto semibold, ícone cheio em azul. Hover: preto a 4%.

### Estado de erro (ErrorState)
- Um só para o admin todo: círculo brand-50 com ícone azul, título do que não carregou, frase do que fazer, "Detalhe:" com a mensagem técnica e "Tentar de novo" (contorno). Em cartão; `bare` dentro de um cartão existente. Erro não é vermelho.

## Do's and Don'ts

### Do:
- **Do** abrir toda tela nova com `PageHero` (título, descrição de uma linha, ações, `HeroStats`) e seguir com `Section`s de gráficos e, por último, `InsightList` / lista de "o que fazer".
- **Do** dar a cada número um rótulo de duas linhas no máximo, uma nota curta e o `help` com a definição.
- **Do** usar as cores de gráfico na ordem cenários / gravações / treinos curtos / jogos, sempre com legenda nomeada e tooltip.
- **Do** usar `ErrorState` para qualquer falha de carga e `HeroStatsSkeleton` para os totais carregando.
- **Do** usar lime-600 (não lime) para sinalizar atenção sobre fundo branco.

### Don't:
- **Don't** pintar uma segunda área de cor cheia na tela; a faixa é a única.
- **Don't** usar laranja, ou vermelho para queda de métrica; queda é lima.
- **Don't** pôr texto pequeno abaixo de white/90 na faixa.
- **Don't** criar linha de KPI em cartões brancos (o antigo `KpiCard`); os totais moram na faixa.
- **Don't** distinguir séries só pela cor.
- **Don't** escrever mensagem de erro crua em vermelho no lugar do `ErrorState`.
