# Retro GUI Builder (WYSIWYG) para Electron

Um construtor de interfaces visuais (Drag-and-Drop) focado na nostalgia e na funcionalidade. Este software permite criar layouts de desktop clássicos que podem ser exportados como HTML/CSS prontos para serem usados em aplicações Electron.

## 🚀 Sobre o Projeto

O **Retro GUI Builder** foi desenvolvido para designers e desenvolvedores que desejam recriar a estética de sistemas operacionais históricos com a facilidade das tecnologias modernas. Diferente de builders web modernos, ele foca em layouts determinísticos (posição absoluta) e fidelidade visual aos componentes nativos de eras passadas.

### 🎨 Temas Suportados
- **Windows 95**: A era do funcionalismo cinza e bordas chanfradas.
- **Apple Classic**: O minimalismo monocromático e tipografia Geneva.
- **Windows XP (Luna)**: O visual icônico com tons de azul, verde e o clássico fundo bege/amarelo.
- **Windows Vista (Aero)**: Estética de transparências (Glass Effect), gradientes e brilhos.

### 🛠️ Funcionalidades Principais
- **Drag-and-Drop Engine**: Arraste widgets da barra lateral diretamente para o canvas.
- **Snap-to-Grid**: Grade de 8px para garantir alinhamento perfeito dos elementos.
- **Sistema de Camadas (Z-Index)**: Controles de "Trazer para Frente" e "Enviar para Trás".
- **Biblioteca de Widgets**: Botões, Campos de Texto, Labels, Checkboxes, GroupBoxes e ProgressBars.
- **Tooltip Hint System**: Adicione dicas (balões amarelos) que aparecem ao passar o mouse.
- **Exportação Interativa**: Gera um arquivo HTML/CSS autônomo com suporte a estados de `:hover`.

---

## 💻 Como Rodar

Este projeto pode ser executado tanto como uma aplicação Desktop nativa quanto em um navegador.

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado.

### Modo Desktop (Electron)
1. Abra o terminal na pasta raiz do projeto.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o builder:
   ```bash
   npm start
   ```

### Modo Web (Navegador)
Você pode simplesmente abrir o arquivo `index.html` em qualquer navegador moderno ou usar um servidor local:
```bash
npm run web
```

---

## 📂 Estrutura de Arquivos
- `index.html`: Ponto de entrada da interface do builder.
- `electron-main.js`: Processo principal do Electron.
- `src/css/main.css`: Estilos globais do editor.
- `src/css/themes/`: Contém os arquivos de estilo específicos para cada era (Win95, XP, Vista, Apple).
- `src/js/main.js`: Motor lógico do builder (DND, Propriedades, Exportação).

---

## ✍️ Autoria e Licença

Desenvolvido por **[Everson Mayer](https://github.com/everctba)**.
Data de Criação: Maio de 2026.

---
*Este projeto utiliza a ferramenta `beads` para rastreamento de tarefas e progresso via `AGENTS.md`.*
