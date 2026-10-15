# Reformulação do Modo Eliminação: Fantasmas Flutuantes & Auto-Giro Dinâmico

Plano revisado de modernização do Modo Eliminação (Battle Royale) com cemitério imersivo de almas flutuantes no fundo da Roleta Padrão, ciclo de auto-giro contínuo e veloz sem interrupção por modais, ativação exclusiva via configurações e restauração completa de participantes ao encerrar o sorteio.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões Centrais Confirmadas com o Usuário**:
> - **Cemitério como Fantasmas no Fundo (SOMENTE Roleta Padrão)**: A aba lateral do cemitério foi eliminada. Os participantes caídos agora flutuam com efeito espectral/fantasma no plano de fundo da arena ao redor da roda na Roleta Padrão, mantendo a barra lateral limpa e a experiência visual marcante.
> - **Auto-Giro Ultra Dinâmico Sem Modais**: Durante o auto-giro, o sistema não interrompe com modais intrusivos. O eliminado sofre corte dramático imediato com áudio e flash visual, engatando automaticamente a rodada seguinte até a grande final.
> - **Seleção de Modo Exclusiva nas Configurações**: Nenhum botão de ativar/desativar modo eliminação na navbar principal; o recurso é selecionado exclusivamente dentro do menu de Configurações.
> - **Correção Definitiva do Reset (Aceitar ou Recusar)**: Ao encerrar o torneio (seja aceitando ou recusando o campeão final), todos os participantes que iniciaram a disputa são restaurados para o estado ativo original da roleta.

---

### 1. Overview & Core Concept

- **O que faz**: Proporciona uma atmosfera de sobrevivência eletrizante onde os participantes são eliminados rodada a rodada. Na Roleta Padrão, as almas dos eliminados transformam-se em fantasmas flutuantes e transparentes que orbitam e flutuam suavemente no fundo da arena, enquanto os sobreviventes disputam a vitória.
- **Público-Alvo**: Apresentadores de sorteios, streamers, dinâmicas de equipes e eventos interativos que exigem alto valor estético, fluidez de giros e ritmo frenético.
- **Valor Principal**: Eliminação orgânica e visual sem burocracia de abas secundárias, ritmo veloz ininterrupto no auto-giro e segurança de que o rol de participantes retorna intacto ao fim.

---

### 2. User Experience & Visual Design

#### A. O Cemitério de Fantasmas (`GhostGraveyardBackground`) — Somente Roleta Padrão
- **Localização e Contexto**: Renderizado exclusivamente quando `eliminationMode === true` e `activeGameMode === 'classic'` (Roleta Padrão).
- **Estética Visual Espectral**:
  - Elementos flutuantes orgânicos com opacidade sutil (`opacity-35` a `opacity-55`), filtro de desfoque atmosférico (`backdrop-blur-xs`) e brilho etéreo.
  - Cada fantasma exibe o nome do participante, cor de identidade atenuada, número da rodada em que caiu (ex: `💀 Rodada 2`) e efeito de oscilação lenta senoidal (animação CSS compositor-only `translateY` e flutuação suave).
  - Distribuição randômica balanceada nas margens e laterais do plano de fundo da roleta, sem nunca obstruir o ponteiro, o botão central de giro ou os textos dos setores ativos.
- **Interatividade Leve**: Ao passar o mouse (`hover`) sobre um fantasma no fundo, ele ganha nitidez sutil (`opacity-90`) e uma dica rápida de tempo e colocação.

#### B. Barra Lateral e Lista de Participantes Limpa
- **Sem Abas no Modo Eliminação**: A barra lateral mantém seu layout direto e funcional em aba única de participantes.
- **Diferenciação Sutil**: Itens eliminados na lista continuam visíveis porém desativados com texto riscado suave e indicador de caveira (`💀`), permitindo focar 100% na lista sem alternar telas.

#### C. Auto-Giro Dinâmico e Sem Bloqueios
- **Fluxo do Auto-Giro**:
  1. A roleta gira com a velocidade selecionada (Normal, Rápida ou Turbo).
  2. Ao parar no item sorteado para eliminação, é disparado o corte de eliminação (som sutil de espada/tique de saída + flash de partículas na fatia).
  3. Sem abrir nenhum modal, o participante é imediatamente transferido para o estado de eliminado (virando fantasma no fundo).
  4. Um delay instantâneo configurável (280ms em Turbo, 550ms em Rápido, 900ms em Normal) ocorre e a roleta gira a próxima rodada automaticamente.
- **Fim da Batalha (Grand Winner)**: Apenas na vitória final do último sobrevivente é exibida a celebração solene com fanfarra triunfante e modal de campeão.

#### D. Correção do Fluxo de Aceitar / Recusar
- No momento em que o modo de eliminação é iniciado, uma fotografia imutável dos IDs dos participantes ativos (`initialEliminationParticipantIds`) é preservada.
- Ao clicar em **"Aceitar"** ou **"Recusar"** (ou fechar o modal final), a função `resetEliminationBattle()` reativa todos os participantes capturados na foto inicial, garantindo que a lista nunca fique restrita ao único vencedor.

---

### 3. Key Product Decisions & Trade-Offs

- **Fantasmas no Fundo vs. Aba no Sidebar**:
  - *Decisão*: Fantasmas etéreos flutuando no background da roleta clássica.
  - *Por quê*: Torna a eliminação um elemento cênico e memorável que enriquece a transmissão, ao invés de esconder os caídos numa abinha secundária burocrática.
  - *Restrição*: Limitado estritamente à Roleta Padrão (`classic`), preservando a clareza e espacialidade dos outros modos (Horizon, Mystery Box, etc.).
- **Remoção de Modal no Auto-Giro**:
  - *Decisão*: Eliminar qualquer pop-up ou modal pausador durante a execução do auto-giro.
  - *Por quê*: Modais forçavam o usuário a clicar ou esperar contagens artificiais, quebrando a adrenalina de um sorteio estilo Battle Royale contínuo.
- **Remoção do Botão na Navbar**:
  - *Decisão*: O Modo Eliminação só pode ser ativado/desativado nas Configurações da aplicação.
  - *Por quê*: Mantém a barra de navegação principal limpa, seguindo o padrão estético e evitando ativações acidentais.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Top3Navbar                            │
│           (Apenas controles padrão, sem botão de modo)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
 ┌─────────────────────────────┴──────────────────────────────┐
 │                    ConfigModal (Menu)                      │
 │        [x] Ativar Modo Eliminação (Battle Royale)          │
 └─────────────────────────────┬──────────────────────────────┘
                               │
 ┌─────────────────────────────▼──────────────────────────────┐
 │                       HomePage                             │
 │   ┌────────────────────────────────────────────────────┐   │
 │   │  EliminationHUD (Contador Vivos/Mortos, Auto-Giro)  │   │
 │   └─────────────────────────┬──────────────────────────┘   │
 │                             ▼                              │
 │   ┌────────────────────────────────────────────────────┐   │
 │   │       Arena da Roleta Padrão (Classic Wheel)       │   │
 │   │                                                    │   │
 │   │   👻 Fantasma 1 (Fundo)       👻 Fantasma 2        │   │
 │   │           [ 🎡 RODA ATIVA DE SOBREVIVENTES ]       │   │
 │   │   👻 Fantasma 3               👻 Fantasma 4        │   │
 │   └────────────────────────────────────────────────────┘   │
 └─────────────────────────────┬──────────────────────────────┘
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                        useAppStore                          │
 │  - initialEliminationParticipantIds: string[]               │
 │  - eliminatedHistory: Array<{ item, round, timestamp }>     │
 │  - resetEliminationBattle(): restaura participantes         │
 └─────────────────────────────────────────────────────────────┘
```

#### Mapeamento de Componentes & Estado
1. **`src/components/organisms/GhostGraveyardBackground.tsx`**:
   - Componente dedicado posicionado como camada absoluta de fundo (`pointer-events-none`) atrás do canvas da roleta clássica.
   - Gera posições flutuantes suaves baseadas no índice dos eliminados, com animações CSS de flutuação vertical e deriva suave.
   - Só renderiza se `eliminationMode === true` e `activeGameMode === 'classic'`.
2. **`src/components/organisms/WheelDisplay.tsx`**:
   - Integração do `GhostGraveyardBackground` no contêiner do palco principal da roleta clássica.
3. **`src/hooks/useGameLoop.ts`**:
   - Desativação do overlay modal no auto-giro, acionando o ciclo contínuo com ritmo dinâmico e transição direta de rodada.
4. **`src/store/useAppStore.ts` & `src/components/organisms/WinnerModal.tsx`**:
   - Garantia do salvamento dos IDs iniciais na largada da batalha e chamada inequívoca de restauração tanto no "Aceitar" quanto no "Recusar".
