import React from "react";
import { Node, Edge } from "reactflow";

// Mock the actual program data structure
const mockProgramData = [
  {
    category: "UE 1 - Sciences chimiques et biologiques",
    semester: 1,
    subcategories: [
      {
        name: "Biochimie",
        topics: ["Métabolisme", "Enzymologie", "Biochimie structurale"],
      },
      {
        name: "Biologie cellulaire",
        topics: ["Membrane cellulaire", "Organites"],
      },
    ],
  },
  {
    category: "UE 2 - Sciences physiques",
    semester: 1,
    subcategories: [
      {
        name: "Physique",
        topics: ["Mécanique", "Thermodynamique"],
      },
    ],
  },
];

// Simulate the toggle function from the actual component
class ExpansionSimulator {
  private expandedNodes: Set<string> = new Set();

  toggleNode(nodeId: string) {
    console.log("Toggling node:", nodeId);

    const newSet = new Set(this.expandedNodes);

    // Determine the level of the node being toggled
    const nodeLevel = nodeId.includes("-sub-") ? "subcategory" : "category";

    if (newSet.has(nodeId)) {
      // Collapse this node and all its children
      newSet.delete(nodeId);
      newSet.forEach((id) => {
        if (id.startsWith(nodeId + "-")) {
          newSet.delete(id);
        }
      });
    } else {
      // Close other nodes of the same level
      if (nodeLevel === "category") {
        // Close other categories
        mockProgramData.forEach((_, index) => {
          const otherCategoryId = `category-${index}`;
          if (otherCategoryId !== nodeId && newSet.has(otherCategoryId)) {
            newSet.delete(otherCategoryId);
            // Also delete all children of the closed category
            newSet.forEach((id) => {
              if (id.startsWith(otherCategoryId + "-")) {
                newSet.delete(id);
              }
            });
          }
        });
      } else if (nodeLevel === "subcategory") {
        // Close other subcategories in the same category
        const categoryPrefix = nodeId.split("-sub-")[0];
        newSet.forEach((id) => {
          if (id.startsWith(categoryPrefix + "-sub-") && id !== nodeId) {
            newSet.delete(id);
            // Also delete all children of the closed subcategory
            newSet.forEach((childId) => {
              if (childId.startsWith(id + "-")) {
                newSet.delete(childId);
              }
            });
          }
        });
      }

      // Add the new node
      newSet.add(nodeId);
    }

    console.log("New expanded nodes:", Array.from(newSet));
    this.expandedNodes = newSet;
    return newSet;
  }

  getExpandedNodes(): Set<string> {
    return new Set(this.expandedNodes);
  }

  // Simulate the complete node generation process like in the main component
  generateNodes(): Node[] {
    const nodes: Node[] = [];
    let categoryYOffset = 100;

    mockProgramData.forEach((ue, ueIndex) => {
      const categoryId = `category-${ueIndex}`;
      const categoryPosition = { x: 100, y: categoryYOffset };

      // Main category node
      nodes.push({
        id: categoryId,
        type: "category",
        position: categoryPosition,
        data: {
          ...ue,
          expanded: this.expandedNodes.has(categoryId),
          onToggle: () => this.toggleNode(categoryId),
        },
        draggable: false,
      });

      console.log(
        `Category ${categoryId} expanded:`,
        this.expandedNodes.has(categoryId)
      );

      if (this.expandedNodes.has(categoryId)) {
        const subcategories = ue.subcategories;

        subcategories.forEach((subcategory, subIndex) => {
          const subcategoryId = `${categoryId}-sub-${subIndex}`;
          const subcategoryPosition = {
            x: categoryPosition.x + 450,
            y: categoryYOffset + subIndex * 150,
          };

          nodes.push({
            id: subcategoryId,
            type: "subcategory",
            position: subcategoryPosition,
            data: {
              ...subcategory,
              expanded: this.expandedNodes.has(subcategoryId),
              onToggle: () => this.toggleNode(subcategoryId),
            },
            draggable: false,
            parentNode: categoryId,
          });

          console.log(
            `Subcategory ${subcategoryId} expanded:`,
            this.expandedNodes.has(subcategoryId)
          );

          if (this.expandedNodes.has(subcategoryId)) {
            const topics = subcategory.topics;

            topics.forEach((topic, topicIndex) => {
              const topicId = `${subcategoryId}-topic-${topicIndex}`;
              const topicPosition = {
                x: subcategoryPosition.x + 350,
                y: subcategoryPosition.y + topicIndex * 100,
              };

              nodes.push({
                id: topicId,
                type: "topic",
                position: topicPosition,
                data: {
                  name: topic,
                },
                draggable: false,
                parentNode: subcategoryId,
              });
            });
          }
        });
      }

      categoryYOffset += 250;
    });

    return nodes;
  }
}

describe("Node Expansion Logic", () => {
  let simulator: ExpansionSimulator;

  beforeEach(() => {
    simulator = new ExpansionSimulator();
  });

  describe("Initial state", () => {
    test("should start with no expanded nodes", () => {
      const expandedNodes = simulator.getExpandedNodes();
      expect(expandedNodes.size).toBe(0);
    });

    test("should generate only category nodes when nothing is expanded", () => {
      const nodes = simulator.generateNodes();
      const categoryNodes = nodes.filter((n) => n.type === "category");
      const subcategoryNodes = nodes.filter((n) => n.type === "subcategory");
      const topicNodes = nodes.filter((n) => n.type === "topic");

      expect(categoryNodes).toHaveLength(2);
      expect(subcategoryNodes).toHaveLength(0);
      expect(topicNodes).toHaveLength(0);
    });
  });

  describe("Category expansion", () => {
    test("should expand a category when toggled", () => {
      const initialNodes = simulator.generateNodes();
      expect(initialNodes.filter((n) => n.type === "subcategory")).toHaveLength(
        0
      );

      // Toggle the first category
      simulator.toggleNode("category-0");

      const expandedNodes = simulator.getExpandedNodes();
      expect(expandedNodes.has("category-0")).toBe(true);

      const nodesAfterExpansion = simulator.generateNodes();
      const subcategoryNodes = nodesAfterExpansion.filter(
        (n) => n.type === "subcategory"
      );

      expect(subcategoryNodes).toHaveLength(2); // Should have 2 subcategories from category-0
      expect(subcategoryNodes.every((n) => n.parentNode === "category-0")).toBe(
        true
      );
    });

    test("should close other categories when expanding one", () => {
      // Expand first category
      simulator.toggleNode("category-0");
      expect(simulator.getExpandedNodes().has("category-0")).toBe(true);

      // Expand second category
      simulator.toggleNode("category-1");

      const expandedNodes = simulator.getExpandedNodes();
      expect(expandedNodes.has("category-0")).toBe(false);
      expect(expandedNodes.has("category-1")).toBe(true);
    });

    test("should collapse category when toggled again", () => {
      // Expand category
      simulator.toggleNode("category-0");
      expect(simulator.getExpandedNodes().has("category-0")).toBe(true);

      // Collapse it
      simulator.toggleNode("category-0");
      expect(simulator.getExpandedNodes().has("category-0")).toBe(false);
    });
  });

  describe("Subcategory expansion", () => {
    test("should expand subcategory when parent is expanded", () => {
      // First expand the category
      simulator.toggleNode("category-0");

      // Then expand a subcategory
      simulator.toggleNode("category-0-sub-0");

      const expandedNodes = simulator.getExpandedNodes();
      expect(expandedNodes.has("category-0")).toBe(true);
      expect(expandedNodes.has("category-0-sub-0")).toBe(true);

      const nodes = simulator.generateNodes();
      const topicNodes = nodes.filter((n) => n.type === "topic");
      expect(topicNodes).toHaveLength(3); // Should have 3 topics from subcategory-0
    });

    test("should close other subcategories in same category", () => {
      // Expand category first
      simulator.toggleNode("category-0");

      // Expand first subcategory
      simulator.toggleNode("category-0-sub-0");
      expect(simulator.getExpandedNodes().has("category-0-sub-0")).toBe(true);

      // Expand second subcategory
      simulator.toggleNode("category-0-sub-1");

      const expandedNodes = simulator.getExpandedNodes();
      expect(expandedNodes.has("category-0-sub-0")).toBe(false);
      expect(expandedNodes.has("category-0-sub-1")).toBe(true);
    });
  });

  describe("Complete workflow", () => {
    test("should handle complete expand/collapse workflow", () => {
      let nodes;

      // Step 1: Start with only categories
      nodes = simulator.generateNodes();
      expect(nodes.filter((n) => n.type === "category")).toHaveLength(2);
      expect(nodes.filter((n) => n.type === "subcategory")).toHaveLength(0);
      expect(nodes.filter((n) => n.type === "topic")).toHaveLength(0);

      // Step 2: Expand first category
      simulator.toggleNode("category-0");
      nodes = simulator.generateNodes();
      expect(nodes.filter((n) => n.type === "category")).toHaveLength(2);
      expect(nodes.filter((n) => n.type === "subcategory")).toHaveLength(2);
      expect(nodes.filter((n) => n.type === "topic")).toHaveLength(0);

      // Step 3: Expand first subcategory
      simulator.toggleNode("category-0-sub-0");
      nodes = simulator.generateNodes();
      expect(nodes.filter((n) => n.type === "category")).toHaveLength(2);
      expect(nodes.filter((n) => n.type === "subcategory")).toHaveLength(2);
      expect(nodes.filter((n) => n.type === "topic")).toHaveLength(3);

      // Step 4: Switch to second subcategory
      simulator.toggleNode("category-0-sub-1");
      nodes = simulator.generateNodes();
      expect(nodes.filter((n) => n.type === "topic")).toHaveLength(2); // Different number of topics

      // Step 5: Collapse category
      simulator.toggleNode("category-0");
      nodes = simulator.generateNodes();
      expect(nodes.filter((n) => n.type === "category")).toHaveLength(2);
      expect(nodes.filter((n) => n.type === "subcategory")).toHaveLength(0);
      expect(nodes.filter((n) => n.type === "topic")).toHaveLength(0);
    });
  });

  describe("Node data consistency", () => {
    test("node data should reflect expansion state", () => {
      // Expand category
      simulator.toggleNode("category-0");
      const nodes = simulator.generateNodes();

      const categoryNode = nodes.find((n) => n.id === "category-0")!;
      expect(categoryNode.data.expanded).toBe(true);

      const subcategoryNodes = nodes.filter((n) => n.type === "subcategory");
      subcategoryNodes.forEach((node) => {
        expect(node.data.expanded).toBe(false); // Not expanded yet
      });
    });

    test("onToggle functions should be correctly bound", () => {
      simulator.toggleNode("category-0");
      const nodes = simulator.generateNodes();

      const categoryNode = nodes.find((n) => n.id === "category-0")!;
      expect(typeof categoryNode.data.onToggle).toBe("function");

      const subcategoryNodes = nodes.filter((n) => n.type === "subcategory");
      subcategoryNodes.forEach((node) => {
        expect(typeof node.data.onToggle).toBe("function");
      });
    });
  });
});
