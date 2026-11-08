# 📝 Interactive Quiz: Algorithmic Complexity & Data Structures

> [!TIP] How to Take this Quiz
> Click any option below to select your answer, then click **⚡ Check Answers** to grade yourself instantly and reveal detailed algorithmic explanations.

```quiz
Q1: What is the worst-case time complexity of Standard Quick Sort without randomized pivot selection?
- [ ] O(log N)
- [ ] O(N log N)
- [x] O(N^2)
- [ ] O(N)
Explanation: When the pivot chosen is always the extreme element (such as sorting an already-sorted array with first/last element pivot), the recursion tree degenerates into depth N, yielding O(N^2) total comparisons.

Q2: Which data structure guarantees O(1) average-time complexity for Insert, Delete, and Lookup operations?
- [ ] Balanced Binary Search Tree (AVL)
- [ ] Binary Heap
- [x] Hash Table
- [ ] Skip List
Explanation: Hash tables achieve O(1) amortized/average time via direct bucket indexing, though hash collisions can degrade pathological worst cases to O(N).

Q3: What algorithmic paradigm does Dijkstra's shortest path algorithm employ?
- [ ] Divide and Conquer
- [x] Greedy Algorithm
- [ ] Dynamic Programming
- [ ] Backtracking with Pruning
Explanation: Dijkstra greedily expands the unvisited vertex with the minimum known distance, making an optimal local choice at each step for non-negative edge weights.
```

