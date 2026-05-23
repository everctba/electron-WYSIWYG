Use comandos 'bd' para rastrear tarefas, dependências e progresso. “Liste o trabalho pronto”

bash
bd ready --json
“Crie uma issue”

bash
bd create "Corrigir bug X" -t bug -p 1
“Mostrar detalhes”

bash
bd show bd-a1b2
“Atualizar status”

bash
bd update bd-a1b2 --status in_progress
“Fechar issue”

bash
bd close bd-a1b2 --reason "Resolvido"
A IA passa a usar isso como memória persistente.

---
Autor: [Everson Mayer] (https://github.com/everctba)
Data/Hora: 2026-05-22
