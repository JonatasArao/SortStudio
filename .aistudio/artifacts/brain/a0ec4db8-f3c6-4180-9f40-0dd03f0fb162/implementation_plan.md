# Aprimoramento da Exibição de Participantes Sem Vitórias

Melhorar o tratamento visual e textual para participantes que ainda não venceram, substituindo alertas alarmistas por badges neutros, discretos e elegantes tanto na lista da barra lateral quanto no modal de ranking.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisões alinhadas e confirmadas pelo usuário:

- **Lista de Participantes na Barra Lateral (`EntryItem`)**: Substituir o badge alarmante `⚠️ Nunca` por um badge com o texto **"Sem vitórias"** em tom neutro, discreto e suave (`slate-800/60` com texto `slate-400`), eliminando ícones de aviso de perigo.
- **Modal de Ranking Ativo (`ResultsModal`)**:
  - Exibir nas linhas de participantes sem vitórias um badge sutil e harmonioso de **"Sem vitórias"** (`bg-slate-800/80` com borda `slate-700/60`).
  - Atualizar o card resumo superior de participantes sem vitórias para um tom neutro e informativo, sem cores de alerta vermelho ou avisos punitivos.
  - No texto de histórico do participante, exibir de forma limpa "Aguardando 1ª vitória" ou data de cadastro.

---

## 1. Overview & Core Concept

- **O que faz**: Transforma a indicação de participantes sem vitórias em uma exibição neutra e profissional. Remove emojis de perigo (`⚠️`) e cores de alerta que transmitiam conotação punitiva ou de erro.
- **Público-alvo**: Usuários e espectadores de sorteios que desejam uma interface polida, profissional e agradável.
- **Valor gerado**: Maior elegância estética (anti-slop visual restraint), clareza informativa e consistência com o tema escuro do aplicativo.

---

## 2. User Experience & Visual Design

### 1. Barra Lateral (`EntryItem.tsx`)
- Participantes com vitória hoje: mantêm destaque esmeralda `🏆 Hoje`.
- Participantes com vitórias anteriores: mantêm indicador de tempo `⏳ Xd`.
- Participantes sem vitórias: passam a exibir badge neutro **"Sem vitórias"** com estilo sutil (`bg-slate-800/70 border-slate-700/50 text-slate-400 font-medium text-[10px]`), com tooltip informativo e sem ícone de perigo.

### 2. Modal de Ranking (`ResultsModal.tsx`)
- **Linha do Participante**:
  - Posição mantida na sequência.
  - Badge direito: **"Sem vitórias"** em pill sutil cinza ardósia, alinhado à hierarquia tipográfica.
  - Subtexto explicativo com data de registro ou status sem ruído.
- **Card Superior "Sem Vitórias" (em temporadas ativas)**:
  - Substituição do ícone vermelho de alerta por ícone sutil de participantes (`Users` ou similar em slate/azul sóbrio), harmonizando com o painel.

---

## 3. Key Product Decisions & Trade-Offs

- **Substituição de `⚠️ Nunca`**:
  - *Abordagem*: Utilizar `"Sem vitórias"` em tipografia limpa.
  - *Por que*: O emoji `⚠️` remete a erros de validação ou alertas de sistema, o que não faz sentido para opções recém-cadastradas na roleta.
- **Harmonização de Cores**:
  - *Abordagem*: Cores neutras (`slate-400` sobre `slate-800/60`) para participantes sem vitórias, reservando cores de destaque (verde e âmbar) para conquistas ativas e líderes.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────┐
│                   EntryItem.tsx                        │
│  stat.hasWon === false:                                │
│    badge: "Sem vitórias" (bg-slate-800/70 text-slate-400)│
│    title: "Sem vitórias registradas"                   │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                   ResultsModal.tsx                     │
│  - RankingItem:                                        │
│      badge: "Sem vitórias" em tom slate neutro         │
│  - Top Card:                                           │
│      estilo neutro discreto (slate-800/80 text-slate-300)│
└────────────────────────────────────────────────────────┘
```

### Arquivos Modificados
1. **`src/components/molecules/EntryItem.tsx`**: Ajuste do badge de status para participantes sem vitórias.
2. **`src/components/organisms/ResultsModal.tsx`**: Ajuste do badge de ranking e do card de resumo de participantes sem vitória.
3. **`src/i18n/locales/pt-BR.json` e `en.json`**: Atualização consistente dos textos de localização.
