---
name: Verbalizei Admin
description: Painel interno do Verbalizei; título sobre o fundo cinza, totalizadores com um destaque verde, depois gráficos, depois o que fazer.
colors:
  primary: "#3f6b16"
  primary-hover: "#33580f"
  green: "#81a641"
  green-600: "#5f8530"
  green-ink: "#4f6e22"
  green-light: "#8cbc45"
  green-100: "#e2eecb"
  green-50: "#f1f6e6"
  secondary-surface: "#eef5e1"
  brand: "#0063de"
  brand-light: "#7fb0ee"
  brand-ink: "#004ba6"
  lime: "#cfdc3e"
  lime-600: "#a8b524"
  lime-ink: "#5e6b0c"
  success-soft: "#e7f0d6"
  warning-soft: "#eef3b8"
  background: "#f3f5ef"
  foreground: "#17210f"
  card: "#ffffff"
  muted: "#f0f2ec"
  muted-foreground: "#5d6655"
  border: "#e5e8df"
  input: "#dde1d5"
  destructive: "#d93a3a"
  chart-1: "#3f6b16"
  chart-2: "#8cbc45"
  chart-3: "#0063de"
  chart-4: "#7fb0ee"
  chart-5: "#a3ab99"
  heat-pos: "#8cbc45"
  heat-neg: "#9fc2f2"
  heat-mid: "#f0f2ec"
typography:
  display:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  stat-highlight:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
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
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Raleway, DM Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
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
  caption:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.375
rounded:
  lg: "10px"
  xl: "12px"
  2xl: "16px"
  card: "22px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
  stat-gap-mobile: "12px"
  grid-gap: "16px"
  block-gap: "24px"
  section-gap: "48px"
  page-max: "1280px"
components:
  stat-highlight:
    backgroundColor: "{colors.green-light}"
    textColor: "#13200a"
    rounded: "{rounded.card}"
    padding: "20px"
  stat:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "20px"
  trend-up:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.green-ink}"
    rounded: "{rounded.full}"
    padding: "2px 6px"
  trend-down:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.lime-ink}"
    rounded: "{rounded.full}"
    padding: "2px 6px"
  trend-flat:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.full}"
    padding: "2px 6px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "24px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.xl}"
    height: "40px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    height: "40px"
  table-header:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.xl}"
    height: "40px"
  badge:
    backgroundColor: "{colors.green-50}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.green-ink}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.lime-ink}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  nav-item-active:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    height: "44px"
---

# Design System: Verbalizei Admin

## Overview

**Creative North Star: "O extrato verde"**

O admin veste a identidade oficial do Verbalizei (manual de marca, out/2026): verde, azul, lima e branco, Raleway nos títulos e DM Sans no texto. **No admin quem predomina é o verde.** A direção foi fixada pelo usuário em 25/10/2026, numa segunda rodada no mesmo dia, e substituiu a "faixa azul" (commit e53197c). A referência são painéis financeiros claros: fundo cinza suave, cartões brancos de canto largo, um cartão verde em destaque, tabela com cabeçalho cinza arredondado, pílulas de status com bolinha e rosca de fatias arredondadas.

Toda tela lê de cima para baixo na mesma ordem: **título sobre o fundo** (h1, uma linha de contexto, ações à direita) → **totalizadores**, o primeiro deles o destaque verde → **gráficos** em cartões brancos → **insights**, frases que dizem o que o número significa e o que fazer. Não há faixa de cor no topo; o único campo de cor cheio da tela é o totalizador em destaque.

Densidade de painel de trabalho, sem enfeite: números grandes, gráficos de 220 px, frases curtas. O azul virou a segunda cor dos dados; ele aparece nos gráficos e não na moldura da tela.

**Key Characteristics:**
- Fundo cinza esverdeado, cartões brancos de canto 22 px, quase sem sombra.
- Um cartão verde por tela: o primeiro totalizador, que ocupa duas colunas na tela grande.
- Cor por significado: verde-escuro = uso e ação, verde = melhorou, lima = atenção, cinza = estável, vermelho só erro.
- Dados em dois verdes e dois azuis, sempre com legenda nomeada.
- Números em Raleway 800 com algarismos tabulares.

## Colors

Quatro cores de marca sobre um fundo cinza esverdeado quase branco; o verde ocupa a interface, o azul fica nos dados.

### Primary
- **Verde floresta** (primary): botão principal, ícone do item ativo do menu, texto da etiqueta "Admin" e dos selos padrão, número do ranking, barra do funil, série principal dos gráficos (chart-1). É "uso" e "ação". Hover em **verde floresta fundo** (primary-hover).
- **Verde folha** (green): o ponto de insight "bom sinal".
- **Verde musgo** (green-600): o anel de foco (`ring`).
- **Verde tinta** (green-ink): texto de sucesso e da pílula de alta.
- **Verde broto** (green-light): segunda série dos gráficos (chart-2), as barras que não são o pico, o polo "acima da média" do mapa de calor e o fim do gradiente do destaque.
- **Verde névoa** (green-100 / green-50 / secondary-surface): avatar, círculo do ícone de erro, etiqueta "Admin", selo padrão, linha selecionada da tabela, botões secundário e fantasma.

### Secondary
- **Azul Verbalizei** (brand): terceira série dos gráficos (micro-treinos, chart-3). Não pinta botão, menu nem moldura.
- **Azul céu** (brand-light): quarta série (jogos, chart-4).
- **Azul gelo** (heat-neg): o polo "abaixo da média" do mapa de calor divergente.

### Tertiary
- **Lima** (lime): a seleção de texto, e só ali como cor cheia.
- **Lima oliva** (lime-600): ponto de insight "atenção" sobre branco.
- **Lima tinta** sobre **lima clara** (lime-ink sobre warning-soft): pílula de queda e selo de aviso.

### Neutral
- **Cinza capim** (background): fundo da página e do menu lateral, que não tem cartão.
- **Branco** (card): cartões, totalizadores, item ativo do menu, tooltips, balões da rosca.
- **Tinta de mato** (foreground): texto principal e a linha de "Usuários" nos gráficos (neutra, para não competir com os tipos).
- **Musgo seco** (muted-foreground): texto de apoio, eixos, cabeçalho de tabela, rótulo de grupo do menu (6:1 sobre branco).
- **Cinza raso** (muted): cabeçalho da tabela, trilho das abas e do funil, pílula estável, casa vazia do mapa de calor.
- **Linha** (border / input): bordas de cartão e campo, grade horizontal dos gráficos.
- **Pedra** (chart-5): ponto de insight neutro.
- **Vermelho erro** (destructive): ação destrutiva, validação e o selo "Inativo".

### Gráficos
Paleta validada com `validate_palette --pairs all` da skill dataviz (25/10/2026), na ordem fixa dos tipos: chart-1 cenários, chart-2 gravações, chart-3 micro-treinos, chart-4 jogos. chart-2 e chart-4 ficam perto de 2,2:1 sobre branco; por isso todo gráfico leva **legenda com nome e valor** e tooltip, e a cor nunca é a única pista. Em barras de uma série, o pico vai em chart-1 e o resto em chart-2. Intensidade (mapa de calor dia × hora, coortes) é chart-1 misturado ao branco em 18/36/56/78/100%, com zero em `muted`.

### Named Rules
**The Meaning Rule.** Cor diz significado, igual em todas as telas: verde-escuro = uso/ação; verde = melhorou; lima = atenção; cinza = estável; azul = segunda cor dos dados. Uma queda nunca é vermelha.

**The Green Highlight Rule.** O verde cheio aparece uma vez por tela como campo de cor: o primeiro totalizador. Todo o resto da tela é branco sobre cinza; o verde volta só em botões, ícone ativo, selos e dados.

**The No Orange Rule.** A marca não tem laranja. Vermelho existe só para erro e ação destrutiva.

## Typography

**Display Font:** Raleway (600/700/800, via next/font; reserva DM Sans)
**Body Font:** DM Sans
**Label/Mono Font:** Geist Mono, só onde há código

**Character:** Raleway extra-negrito dá aos títulos e números a voz da marca; DM Sans deixa o texto e as tabelas calmos e legíveis.

### Hierarchy
- **Display** (800, 1.75rem no celular / 2rem, leading-tight): o h1 da tela, sobre o fundo. Um por tela.
- **Stat** (800, 1.625rem no celular / 2rem, leading 1, tabular): número do totalizador. No destaque, 2.75rem a partir de `lg` (**Stat highlight**).
- **Headline** (700, 1.25rem): título de `Section`.
- **Title** (Raleway 700, 1rem): título de cartão (`CardTitle` usa `font-display`).
- **Body** (400, 15px): insights, descrição do topo, itens do menu; 14px em descrições de seção e de cartão.
- **Label** (500, 13px): rótulo do totalizador.
- **Caption** (500, 12px): nota do totalizador, cabeçalho de tabela, selos, eixos e legendas; pílula de variação em 11px bold; rótulo de grupo do menu em 11px semibold maiúsculo com 0.08em.

### Named Rules
**The Raleway For Headings Rule.** h1, h2 e h3 são Raleway (global em globals.css); tudo o mais é DM Sans. Número que importa usa `font-display` + `tabular-nums`.

## Layout

- **Casca:** menu lateral fixo de 256 px a partir de `md`, no mesmo cinza do fundo e separado só por uma borda. No celular, barra de 56 px (fundo a 90% com desfoque) com a marca e o botão de menu, que abre uma gaveta de 288 px (máx. 85vw) sobre véu preto a 30%.
- **Área de conteúdo:** máx. 1280 px, centrada; respiro 16 / 24 / 32 px (celular / sm / lg); 24 px entre blocos de topo.
- **Ordem de toda tela:** `PageHero` (título + ações, 20 px, totalizadores) → `Section`s de gráficos (grades de 2 ou 3 colunas em `lg`, 16 px de vão) → `Section` de insights. Entre seções, 48 px.
- **Topo:** título e descrição à esquerda (máx. 42rem), ações alinhadas à base à direita em `lg`; no celular as ações descem e as abas rolam de lado em vez de vazar.
- **Totalizadores:** 2 colunas no celular (12 px de vão, 16 a partir de `sm`). Na tela grande a grade tem uma coluna a mais que os totais e o primeiro ocupa duas: 3 → 4 col, 4 → 5, 5 → 6, 6 → 7 (este só em `xl`).

### Named Rules
**The Title On Ground Rule.** Toda tela abre em `PageHero`: o título fica direto sobre o fundo cinza, sem faixa nem cartão, e os totais vêm logo abaixo em `HeroStats`, o primeiro como destaque verde. Não há outra linha de KPI na tela.

## Elevation & Depth

Plano por padrão; a profundidade vem do branco contra o cinza. Cartões de conteúdo usam borda de 1 px e `shadow-none`. Sombra existe em quatro papéis só, todas tingidas de verde-escuro, nunca de preto puro.

### Shadow Vocabulary
- **Brilho do destaque** (`0 14px 30px -20px rgb(63 107 22 / 0.7)`): só o primeiro totalizador.
- **Botão principal** (`0 6px 16px -8px rgb(63 107 22 / 0.6)`): sombra verde curta sob o botão cheio.
- **Item ativo do menu** (`0 1px 2px rgb(23 33 15 / 0.06), 0 4px 12px -6px rgb(23 33 15 / 0.12)`): levanta a pílula branca do fundo cinza.
- **Flutuante** (`shadow-md` / `shadow-xl`, e o balão da rosca com sombra de 14%): tooltips, balões de % e gaveta do celular.

## Shapes

Cantos generosos: cartões, totalizadores, lista de insights e "Detalhes técnicos" com 22 px; botões, campos, trilho das abas, itens de menu e as pontas do cabeçalho da tabela com 12 px; aba ativa, tooltip e rótulo de grupo com 10 px; caixa da conta no menu com 16 px. Pílulas (variação, selos, contagem do grupo, turnos do dia, número do ranking) e pontos de insight são redondos. Nos gráficos, barras com 3–4 px no topo, casas do mapa de calor com 3 px e fatias da rosca com 10 px de ponta.

## Components

### Topo da tela (PageHero)
- h1 Display direto sobre o fundo, descrição em musgo seco 15 px, ações à direita. Os filhos ficam num bloco `empty:hidden`, para que totais que falharam não deixem vão.

### Totalizador (HeroStat)
- Cartão branco com borda, canto 22 px, padding 16 px (20 px a partir de `sm`).
- Ordem fixa: rótulo (reserva duas linhas, `min-h-[2lh]`, para alinhar os números) → número Raleway 800 com a pílula de variação ao lado, quebrando para baixo se faltar espaço → nota curta (1 linha no celular, 2 no desktop).
- Pílula: verde tinta em verde claro sobe, lima tinta em lima clara cai, cinza estável, sempre com seta.
- A explicação do número vai no `help` (atributo title), não em texto extra.
- **Destaque:** o primeiro da lista. Gradiente 140° de `#b6d873` a verde broto, dois círculos brancos translúcidos (28% e 16%) no canto inferior direito, sem borda, brilho do destaque. Texto `#13200a` (7,6:1 no pior ponto), rótulo e nota a 82%, pílula com o mesmo sentido: alta escura `#1f3a0a` com texto branco, queda em lima com texto `#2f3604`, estável branca a 55%, número a 2.75rem em `lg`. Ocupa duas colunas na tela grande.
- Carregando: `HeroStatsSkeleton` com o mesmo `count`, blocos de 132 px; o primeiro em verde névoa, os outros brancos com borda.

### Seção (Section)
- Título Raleway 700 20 px, descrição em musgo seco 14 px, `aside` opcional à direita; 16 px até o conteúdo.

### Cartões
- Branco, canto 22 px, borda 1 px, sem sombra, padding 24 px. Cartão de gráfico: 16 px entre itens, título Raleway 16 px, uma frase que lê o gráfico em tinta a 80% e legenda.

### Gráficos
- Recharts, 220 px de altura, só grade horizontal, eixos sem linha em 12 px, sem animação. Área com degradê de chart-1 de 18% a 0. Tooltip em cartão branco de canto 10 px com ponto de cor + rótulo + valor.
- **Rosca (KindDonut):** anel de 58% a 92%, 3° de vão entre fatias, ponta de 10 px, começa às 12h. % em balões brancos de 26 px (canto 8, 13 px bold) sobre o anel, omitidos abaixo de 6%. Total no centro em Raleway 800. Embaixo, lista com bolinha, nome, número e %.
- **Funil:** barra chart-1 sobre trilho `muted` de 10 px, redonda, com contagem e %.

### Tabelas
- Cabeçalho numa faixa `muted` sem linha, pontas de 12 px, 40 px de altura, texto 12 px medium musgo seco.
- Linhas com divisória `border` a 70%, células com 14 px acima e abaixo e 12 px dos lados, hover `muted` a 45%, selecionada em verde névoa.

### Selos (Badge)
- Pílula de 12 px semibold, sem borda: padrão verde névoa + verde floresta, secundário cinza, sucesso, aviso (lima), destrutivo (vermelho a 10%), contorno branco.
- **Status com bolinha:** "Ativo"/"Inativo" levam um ponto de 6 px na cor do texto antes da palavra.

### Insights (InsightList)
- O próprio cartão branco (canto 22 px), frases de 15 px com divisória entre elas, cada uma com ponto de 8 px no tom do que diz: verde floresta (uso), verde folha (bom sinal), lima oliva (atenção), pedra (neutro). Uma ou duas colunas.

### Botões
- **Forma:** canto 12 px, altura 40 px (sm 36, lg 44), semibold, encolhe a 98% ao clicar, anel de foco de 3 px em verde musgo a 50%.
- **Principal:** verde floresta cheio, bold, sombra verde, hover verde floresta fundo. **Contorno:** branco com texto musgo seco; hover escurece a borda (`#b7bfaa`) e o texto. **Secundário / fantasma:** verde névoa. **Destrutivo:** vermelho, só para excluir.

### Campos e abas
- Campo: 40 px, canto 12 px, borda `input`, foco com borda e anel verde musgo. Abas: trilho `muted` de 40 px, aba ativa branca, semibold, com sombra leve; com muitas opções, rolam de lado.

### Navegação
- Marca no topo: ícone `icone_admin.png` (círculo verde-lima, o mesmo da aba do navegador) a 36 px, "Verbalizei" em Raleway 800 19 px e a pílula "Admin" em verde névoa.
- Três grupos na ordem Métricas → Pessoas → Conteúdo, rótulo de grupo 11 px maiúsculo musgo seco. Só o grupo da tela atual fica aberto (não fecha); os outros abrem por clique e lembram no navegador, mostrando a contagem quando fechados.
- Item: 44 px, canto 12 px, ícone Phosphor 22 px, texto 15 px. Ativo: pílula branca com a sombra do item ativo, texto semibold, ícone cheio em verde floresta. Hover: branco a 70%.
- Pé: caixa branca da conta (avatar em verde névoa) e "Sair".

### Estado de erro (ErrorState)
- Um só para o admin todo: círculo verde névoa com ícone verde floresta, título do que não carregou, frase do que fazer, "Detalhe:" com a mensagem técnica e "Tentar de novo" (contorno). Em cartão; `bare` dentro de um cartão existente. Erro não é vermelho.

## Do's and Don'ts

### Do:
- **Do** abrir toda tela nova com `PageHero` (título sobre o fundo, descrição de uma linha, ações, `HeroStats`) e seguir com `Section`s de gráficos e, por último, `InsightList` / lista de "o que fazer".
- **Do** pôr o totalizador mais importante da tela em primeiro: ele vira o destaque verde e ocupa duas colunas.
- **Do** dar a cada número um rótulo de duas linhas no máximo, uma nota curta e o `help` com a definição.
- **Do** usar as cores de gráfico na ordem cenários / gravações / micro-treinos / jogos (verde-escuro, verde broto, azul, azul céu), sempre com legenda nomeada e tooltip.
- **Do** usar o cabeçalho cinza arredondado e o selo com bolinha em toda tabela de status.
- **Do** usar `ErrorState` para qualquer falha de carga e `HeroStatsSkeleton` para os totais carregando.
- **Do** usar lime-600 ou lime-ink (não lime) para sinalizar atenção sobre fundo claro.

### Don't:
- **Don't** voltar a pintar uma faixa de cor no topo da tela; o título fica sobre o fundo.
- **Don't** criar um segundo cartão verde cheio na mesma tela; o destaque é só o primeiro totalizador.
- **Don't** usar o azul em botão, menu ou moldura; no admin ele é cor de dado.
- **Don't** usar laranja, ou vermelho para queda de métrica; queda é lima.
- **Don't** distinguir séries só pela cor.
- **Don't** escrever mensagem de erro crua em vermelho no lugar do `ErrorState`.
