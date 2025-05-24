import React from "react";
import { render } from "@testing-library/react";
import { Node, Edge } from "reactflow";

// Mock the program data
const mockProgramData = [
  {
    category: "UE 1 - Test Category",
    semester: 1,
    subcategories: [
      {
        name: "Subcategory 1",
        topics: ["Topic 1.1", "Topic 1.2", "Topic 1.3"],
      },
      {
        name: "Subcategory 2",
        topics: ["Topic 2.1"],
      },
    ],
  },
  {
    category: "UE 2 - Another Category",
    semester: 2,
    subcategories: [
      {
        name: "Single Sub",
        topics: ["Single Topic"],
      },
    ],
  },
];

// Extract and adapt the positioning logic from the main component
class NodePositionCalculator {
  private nodeDimensions = {
    category: { width: 300, height: 140 },
    subcategory: { width: 250, height: 110 },
    topic: { width: 200, height: 90 },
  };

  private horizontalGap = 150;
  private verticalGap = 20;
  private categoryGap = 75;

  calculateNodePositions(
    programData: typeof mockProgramData,
    expandedNodes: Set<string>
  ): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let categoryYOffset = 100;

    programData.forEach((ue, ueIndex) => {
      const categoryId = `category-${ueIndex}`;
      const categoryPosition = { x: 100, y: categoryYOffset };

      // Add category node
      nodes.push({
        id: categoryId,
        type: "category",
        position: categoryPosition,
        data: { ...ue, expanded: expandedNodes.has(categoryId) },
        draggable: false,
      });

      if (expandedNodes.has(categoryId)) {
        const subcategories = ue.subcategories;
        const subcategoryCount = subcategories.length;
        const categoryCenterY =
          categoryPosition.y + this.nodeDimensions.category.height / 2;

        // Calculate subcategory positions
        const subcategoryYPositions = this.calculateChildPositions(
          categoryCenterY,
          subcategoryCount,
          this.nodeDimensions.subcategory.height
        );

        subcategories.forEach((subcategory, subIndex) => {
          const subcategoryId = `${categoryId}-sub-${subIndex}`;
          const subcategoryY = subcategoryYPositions[subIndex];
          const subcategoryPosition = {
            x:
              categoryPosition.x +
              this.nodeDimensions.category.width +
              this.horizontalGap,
            y: subcategoryY,
          };

          nodes.push({
            id: subcategoryId,
            type: "subcategory",
            position: subcategoryPosition,
            data: {
              ...subcategory,
              expanded: expandedNodes.has(subcategoryId),
            },
            draggable: false,
            parentNode: categoryId,
          });

          edges.push({
            id: `${categoryId}-${subcategoryId}`,
            source: categoryId,
            target: subcategoryId,
            type: "smoothstep",
            animated: true,
          });

          if (expandedNodes.has(subcategoryId)) {
            const topics = subcategory.topics;
            const topicCount = topics.length;
            const subcategoryCenterY =
              subcategoryPosition.y +
              this.nodeDimensions.subcategory.height / 2;

            // Calculate topic positions
            const topicYPositions = this.calculateChildPositions(
              subcategoryCenterY,
              topicCount,
              this.nodeDimensions.topic.height
            );

            topics.forEach((topic, topicIndex) => {
              const topicId = `${subcategoryId}-topic-${topicIndex}`;
              const topicY = topicYPositions[topicIndex];
              const topicPosition = {
                x:
                  subcategoryPosition.x +
                  this.nodeDimensions.subcategory.width +
                  this.horizontalGap,
                y: topicY,
              };

              nodes.push({
                id: topicId,
                type: "topic",
                position: topicPosition,
                data: { name: topic },
                draggable: false,
                parentNode: subcategoryId,
              });

              edges.push({
                id: `${subcategoryId}-${topicId}`,
                source: subcategoryId,
                target: topicId,
                type: "smoothstep",
                animated: true,
              });
            });
          }
        });
      }

      categoryYOffset += this.nodeDimensions.category.height + this.categoryGap;
    });

    return { nodes, edges };
  }

  private calculateChildPositions(
    parentCenterY: number,
    childCount: number,
    childHeight: number
  ): number[] {
    if (childCount === 1) {
      return [parentCenterY - childHeight / 2];
    }

    const totalSpaceNeeded =
      (childCount - 1) * (childHeight + this.verticalGap);
    const startOffset = -(totalSpaceNeeded / 2);

    const positions: number[] = [];
    for (let i = 0; i < childCount; i++) {
      const yPosition =
        parentCenterY +
        startOffset +
        i * (childHeight + this.verticalGap) -
        childHeight / 2;
      positions.push(yPosition);
    }

    return positions;
  }

  // Helper method to get node center
  getNodeCenter(node: Node): { x: number; y: number } {
    const nodeType = node.type as keyof typeof this.nodeDimensions;
    const dimensions =
      this.nodeDimensions[nodeType] || this.nodeDimensions.category;

    return {
      x: node.position.x + dimensions.width / 2,
      y: node.position.y + dimensions.height / 2,
    };
  }

  // Helper method to check if children are centered relative to parent
  areChildrenCentered(parentNode: Node, childNodes: Node[]): boolean {
    const parentCenter = this.getNodeCenter(parentNode);

    if (childNodes.length === 0) return true;
    if (childNodes.length === 1) {
      const childCenter = this.getNodeCenter(childNodes[0]);
      return Math.abs(childCenter.y - parentCenter.y) < 1; // Allow 1px tolerance
    }

    // For multiple children, check if they are symmetrically distributed
    const childCenters = childNodes.map((child) => this.getNodeCenter(child).y);
    const avgChildY =
      childCenters.reduce((sum, y) => sum + y, 0) / childCenters.length;

    return Math.abs(avgChildY - parentCenter.y) < 1; // Allow 1px tolerance
  }
}

describe("generateNodesAndEdges - Vertical Alignment", () => {
  let calculator: NodePositionCalculator;

  beforeEach(() => {
    calculator = new NodePositionCalculator();
  });

  describe("Single child centering", () => {
    test("single subcategory should be centered on parent category", () => {
      const expandedNodes = new Set(["category-0"]);
      const singleSubData = [
        {
          category: "Test Category",
          semester: 1,
          subcategories: [
            {
              name: "Single Sub",
              topics: ["Topic 1"],
            },
          ],
        },
      ];

      const { nodes } = calculator.calculateNodePositions(
        singleSubData,
        expandedNodes
      );

      const categoryNode = nodes.find((n) => n.id === "category-0")!;
      const subcategoryNode = nodes.find((n) => n.id === "category-0-sub-0")!;

      expect(categoryNode).toBeDefined();
      expect(subcategoryNode).toBeDefined();

      // Debug logging to understand positioning
      const categoryCenter = calculator.getNodeCenter(categoryNode);
      const subcategoryCenter = calculator.getNodeCenter(subcategoryNode);

      console.log("Category center:", categoryCenter);
      console.log("Subcategory center:", subcategoryCenter);
      console.log(
        "Vertical difference:",
        Math.abs(subcategoryCenter.y - categoryCenter.y)
      );

      const isChildCentered = calculator.areChildrenCentered(categoryNode, [
        subcategoryNode,
      ]);
      expect(isChildCentered).toBe(true);
    });

    test("single topic should be centered on parent subcategory", () => {
      const expandedNodes = new Set(["category-0", "category-0-sub-1"]);

      const { nodes } = calculator.calculateNodePositions(
        mockProgramData,
        expandedNodes
      );

      const subcategoryNode = nodes.find((n) => n.id === "category-0-sub-1")!;
      const topicNode = nodes.find((n) => n.id === "category-0-sub-1-topic-0")!;

      const isChildCentered = calculator.areChildrenCentered(subcategoryNode, [
        topicNode,
      ]);
      expect(isChildCentered).toBe(true);
    });
  });

  describe("Multiple children centering", () => {
    test("multiple subcategories should be centered around parent category", () => {
      const expandedNodes = new Set(["category-0"]);

      const { nodes } = calculator.calculateNodePositions(
        mockProgramData,
        expandedNodes
      );

      const categoryNode = nodes.find((n) => n.id === "category-0")!;
      const subcategoryNodes = nodes.filter(
        (n) =>
          n.id.startsWith("category-0-sub-") && n.parentNode === "category-0"
      );

      expect(subcategoryNodes).toHaveLength(2);

      const isChildrenCentered = calculator.areChildrenCentered(
        categoryNode,
        subcategoryNodes
      );
      expect(isChildrenCentered).toBe(true);
    });

    test("multiple topics should be centered around parent subcategory", () => {
      const expandedNodes = new Set(["category-0", "category-0-sub-0"]);

      const { nodes } = calculator.calculateNodePositions(
        mockProgramData,
        expandedNodes
      );

      const subcategoryNode = nodes.find((n) => n.id === "category-0-sub-0")!;
      const topicNodes = nodes.filter(
        (n) =>
          n.id.startsWith("category-0-sub-0-topic-") &&
          n.parentNode === "category-0-sub-0"
      );

      expect(topicNodes).toHaveLength(3);

      const isChildrenCentered = calculator.areChildrenCentered(
        subcategoryNode,
        topicNodes
      );
      expect(isChildrenCentered).toBe(true);
    });
  });

  describe("Position calculations", () => {
    test("child positions should be calculated correctly for odd number of children", () => {
      const parentCenterY = 200;
      const childCount = 3;
      const childHeight = 90;

      const positions = (calculator as any).calculateChildPositions(
        parentCenterY,
        childCount,
        childHeight
      );

      expect(positions).toHaveLength(3);

      // Middle child should be centered on parent
      const middleChildCenter = positions[1] + childHeight / 2;
      expect(Math.abs(middleChildCenter - parentCenterY)).toBeLessThan(1);

      // Children should be evenly spaced
      const spacing1 = positions[1] - positions[0];
      const spacing2 = positions[2] - positions[1];
      expect(Math.abs(spacing1 - spacing2)).toBeLessThan(1);
    });

    test("child positions should be calculated correctly for even number of children", () => {
      const parentCenterY = 200;
      const childCount = 4;
      const childHeight = 90;

      const positions = (calculator as any).calculateChildPositions(
        parentCenterY,
        childCount,
        childHeight
      );

      expect(positions).toHaveLength(4);

      // Average of all child centers should equal parent center
      const childCenters = positions.map((pos) => pos + childHeight / 2);
      const avgChildCenter =
        childCenters.reduce((sum, center) => sum + center, 0) /
        childCenters.length;
      expect(Math.abs(avgChildCenter - parentCenterY)).toBeLessThan(1);
    });

    test("single child should be exactly centered", () => {
      const parentCenterY = 200;
      const childCount = 1;
      const childHeight = 90;

      const positions = (calculator as any).calculateChildPositions(
        parentCenterY,
        childCount,
        childHeight
      );

      expect(positions).toHaveLength(1);

      const childCenter = positions[0] + childHeight / 2;
      expect(childCenter).toBe(parentCenterY);
    });
  });

  describe("Node structure validation", () => {
    test("should create correct parent-child relationships", () => {
      const expandedNodes = new Set(["category-0", "category-0-sub-0"]);

      const { nodes } = calculator.calculateNodePositions(
        mockProgramData,
        expandedNodes
      );

      // Check subcategory parent relationships
      const subcategoryNodes = nodes.filter((n) => n.type === "subcategory");
      subcategoryNodes.forEach((node) => {
        expect(node.parentNode).toMatch(/^category-\d+$/);
      });

      // Check topic parent relationships
      const topicNodes = nodes.filter((n) => n.type === "topic");
      topicNodes.forEach((node) => {
        expect(node.parentNode).toMatch(/^category-\d+-sub-\d+$/);
      });
    });

    test("should only create nodes for expanded categories", () => {
      const expandedNodes = new Set(["category-0"]); // Only expand first category

      const { nodes } = calculator.calculateNodePositions(
        mockProgramData,
        expandedNodes
      );

      // Should have category nodes for both categories
      const categoryNodes = nodes.filter((n) => n.type === "category");
      expect(categoryNodes).toHaveLength(2);

      // Should only have subcategory nodes for expanded category
      const subcategoryNodes = nodes.filter((n) => n.type === "subcategory");
      expect(subcategoryNodes).toHaveLength(2); // Only from category-0

      // Should have no topic nodes since no subcategories are expanded
      const topicNodes = nodes.filter((n) => n.type === "topic");
      expect(topicNodes).toHaveLength(0);
    });
  });

  describe("Edge cases", () => {
    test("should handle empty subcategories", () => {
      const emptyData = [
        {
          category: "Empty Category",
          semester: 1,
          subcategories: [],
        },
      ];

      const expandedNodes = new Set(["category-0"]);

      const { nodes, edges } = calculator.calculateNodePositions(
        emptyData,
        expandedNodes
      );

      expect(nodes).toHaveLength(1); // Only category node
      expect(edges).toHaveLength(0); // No edges
    });

    test("should handle subcategory with empty topics", () => {
      const emptyTopicsData = [
        {
          category: "Test Category",
          semester: 1,
          subcategories: [
            {
              name: "Empty Topics Sub",
              topics: [],
            },
          ],
        },
      ];

      const expandedNodes = new Set(["category-0", "category-0-sub-0"]);

      const { nodes, edges } = calculator.calculateNodePositions(
        emptyTopicsData,
        expandedNodes
      );

      const subcategoryNodes = nodes.filter((n) => n.type === "subcategory");
      const topicNodes = nodes.filter((n) => n.type === "topic");

      expect(subcategoryNodes).toHaveLength(1);
      expect(topicNodes).toHaveLength(0);
    });
  });

  describe("Spacing validation", () => {
    test("children should not overlap", () => {
      const expandedNodes = new Set(["category-0", "category-0-sub-0"]);

      const { nodes } = calculator.calculateNodePositions(
        mockProgramData,
        expandedNodes
      );

      const topicNodes = nodes.filter(
        (n) => n.type === "topic" && n.parentNode === "category-0-sub-0"
      );
      topicNodes.sort((a, b) => a.position.y - b.position.y);

      for (let i = 0; i < topicNodes.length - 1; i++) {
        const currentBottom = topicNodes[i].position.y + 90; // topic height
        const nextTop = topicNodes[i + 1].position.y;

        expect(nextTop).toBeGreaterThanOrEqual(currentBottom);
      }
    });

    test("horizontal spacing should be consistent", () => {
      const expandedNodes = new Set(["category-0", "category-0-sub-0"]);

      const { nodes } = calculator.calculateNodePositions(
        mockProgramData,
        expandedNodes
      );

      const categoryNode = nodes.find((n) => n.id === "category-0")!;
      const subcategoryNode = nodes.find((n) => n.id === "category-0-sub-0")!;
      const topicNode = nodes.find((n) => n.id === "category-0-sub-0-topic-0")!;

      const categoryToSubGap =
        subcategoryNode.position.x - (categoryNode.position.x + 300);
      const subToTopicGap =
        topicNode.position.x - (subcategoryNode.position.x + 250);

      expect(categoryToSubGap).toBe(150);
      expect(subToTopicGap).toBe(150);
    });
  });
});
