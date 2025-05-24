"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  ConnectionMode,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";

import programData from "../ressources/program.json";
import { CategoryNode } from "./components/CategoryNode";
import { SubcategoryNode } from "./components/SubcategoryNode";
import { TopicNode } from "./components/TopicNode";
import { ProgressProvider } from "./contexts/ProgressContext";
import { FloatingStats } from "./components/FloatingStats";
import { AnimatedBackground } from "./components/AnimatedBackground";

const nodeTypes = {
  category: CategoryNode,
  subcategory: SubcategoryNode,
  topic: TopicNode,
};

interface SkillProgress {
  [key: string]: {
    level: number; // 0-100
    status: "locked" | "available" | "in-progress" | "completed" | "mastered";
    timeSpent: number;
    lastAccessed: Date | null;
  };
}

export default function HomePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [skillProgress, setSkillProgress] = useState<SkillProgress>({});

  // Generate initial nodes and edges
  const generateNodesAndEdges = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Node dimensions for layout calculations - Updated to match actual component sizes
    const nodeDimensions = {
      category: { width: 300, height: 140 },
      subcategory: { width: 250, height: 110 },
      topic: { width: 200, height: 90 },
    };

    // Consistent gaps between node levels
    const horizontalGap = 100; // Gap between levels
    const verticalGap = 20; // Gap between sibling nodes
    const categoryGap = 75; // Minimal gap between root categories

    let categoryYOffset = 100; // Starting Y position

    programData.forEach((ue, ueIndex) => {
      const categoryId = `category-${ueIndex}`;
      const categoryPosition = { x: 100, y: categoryYOffset };

      // Main category node
      newNodes.push({
        id: categoryId,
        type: "category",
        position: categoryPosition,
        data: {
          ...ue,
          expanded: expandedNodes.has(categoryId),
          onToggle: () => toggleNode(categoryId),
          progress: skillProgress[categoryId] || {
            level: 0,
            status: "available",
          },
        },
        draggable: false,
      });

      if (expandedNodes.has(categoryId)) {
        const subcategories = ue.subcategories;
        const subcategoryCount = subcategories.length;

        // Calculate the exact center point of the parent category
        const categoryCenterY =
          categoryPosition.y + nodeDimensions.category.height / 2;

        console.log(categoryCenterY);

        // For proper centering: position children so the middle child (or middle of group) aligns with parent center
        const subcategoryYPositions: number[] = [];

        // Multiple children: distribute them symmetrically around parent center
        const totalSpaceNeeded =
          (subcategoryCount - 1) * verticalGap +
          subcategoryCount * nodeDimensions.subcategory.height;
        const startOffset = -(totalSpaceNeeded / 2);

        for (let i = 0; i < subcategoryCount; i++) {
          const yPosition =
            startOffset +
            (i + 1) * nodeDimensions.subcategory.height +
            i * verticalGap;
          subcategoryYPositions.push(yPosition);
        }

        // Position each subcategory
        subcategories.forEach((subcategory, subIndex) => {
          const subcategoryId = `${categoryId}-sub-${subIndex}`;
          const subcategoryY = subcategoryYPositions[subIndex];
          const subcategoryPosition = {
            x:
              categoryPosition.x +
              nodeDimensions.category.width +
              horizontalGap,
            y: subcategoryY,
          };

          newNodes.push({
            id: subcategoryId,
            type: "subcategory",
            position: subcategoryPosition,
            data: {
              ...subcategory,
              expanded: expandedNodes.has(subcategoryId),
              onToggle: () => toggleNode(subcategoryId),
              progress: skillProgress[subcategoryId] || {
                level: 0,
                status: "available",
              },
            },
            draggable: false,
            parentNode: categoryId,
          });

          // Edge from category to subcategory
          newEdges.push({
            id: `${categoryId}-${subcategoryId}`,
            source: categoryId,
            target: subcategoryId,
            animated: true,
            sourceHandle: "source",
            targetHandle: "target",
            type: "smoothstep",
            style: { stroke: "#8b5cf6", strokeWidth: 2 },
          });

          if (expandedNodes.has(subcategoryId)) {
            const topics = subcategory.topics;
            const topicCount = topics.length;

            // Calculate the exact center point of the parent subcategory
            const subcategoryCenterY =
              subcategoryPosition.y + nodeDimensions.subcategory.height / 2;

            // For proper centering: position children so the middle child (or middle of group) aligns with parent center
            const topicYPositions: number[] = [];

            // Use the same logic as above for consistency
            const totalSpaceNeeded =
              (topicCount - 1) * verticalGap +
              topicCount * nodeDimensions.topic.height;
            const startOffset = -(totalSpaceNeeded / 2);

            for (let i = 0; i < topicCount; i++) {
              const yPosition =
                startOffset +
                (i + 1) * nodeDimensions.topic.height +
                i * verticalGap -
                nodeDimensions.topic.height;
              topicYPositions.push(yPosition);
            }

            // Position each topic
            topics.forEach((topic, topicIndex) => {
              const topicId = `${subcategoryId}-topic-${topicIndex}`;
              const topicY = topicYPositions[topicIndex];
              const topicPosition = {
                x:
                  subcategoryPosition.x +
                  nodeDimensions.subcategory.width -
                  horizontalGap,
                y: topicY,
              };

              newNodes.push({
                id: topicId,
                type: "topic",
                position: topicPosition,
                data: {
                  name: topic,
                  progress: skillProgress[topicId] || {
                    level: 0,
                    status: "available",
                  },
                  onProgressUpdate: (newProgress: number) =>
                    updateProgress(topicId, newProgress),
                },
                draggable: false,
                parentNode: subcategoryId,
              });

              // Edge from subcategory to topic
              newEdges.push({
                id: `${subcategoryId}-${topicId}`,
                source: subcategoryId,
                target: topicId,
                type: "smoothstep",
                animated: true,
                sourceHandle: "source",
                targetHandle: "target",
                style: { stroke: "#06b6d4", strokeWidth: 1.5 },
              });
            });
          }
        });

        // Calculate the absolute bottom of all content to determine next category position
        let contentBottom = categoryPosition.y + nodeDimensions.category.height;

        // Find the actual bottom of subcategories
        if (subcategoryCount > 0) {
          const maxSubcategoryBottom = Math.max(
            ...subcategoryYPositions.map(
              (y) => y + nodeDimensions.subcategory.height
            )
          );
          contentBottom = Math.max(contentBottom, maxSubcategoryBottom);

          // Find the actual bottom of any expanded topics
          subcategories.forEach((subcategory, subIndex) => {
            const subcategoryId = `${categoryId}-sub-${subIndex}`;
            if (expandedNodes.has(subcategoryId)) {
              const topicCount = subcategory.topics.length;
              if (topicCount > 0) {
                const subcategoryY = subcategoryYPositions[subIndex];
                const subcategoryCenterY =
                  subcategoryY + nodeDimensions.subcategory.height / 2;

                // Calculate topic positions for this subcategory
                const topicYPositions: number[] = [];

                // Use the same logic as above for consistency
                const totalSpaceNeeded =
                  (topicCount - 1) * verticalGap +
                  topicCount * nodeDimensions.topic.height;
                const startOffset = -(totalSpaceNeeded / 2);

                for (let i = 0; i < topicCount; i++) {
                  const yPosition =
                    subcategoryCenterY +
                    startOffset +
                    (i + 1) * nodeDimensions.topic.height +
                    i * verticalGap -
                    nodeDimensions.topic.height;
                  topicYPositions.push(yPosition);
                }

                const maxTopicBottom = Math.max(
                  ...topicYPositions.map((y) => y + nodeDimensions.topic.height)
                );
                contentBottom = Math.max(contentBottom, maxTopicBottom);
              }
            }
          });
        }
      }
      // Next category position
      categoryYOffset += nodeDimensions.category.height + categoryGap;
    });
    console.log(newNodes);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [expandedNodes, skillProgress]);

  const toggleNode = useCallback((nodeId: string) => {
    console.log("Toggling node:", nodeId); // Debug log
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);

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
          programData.forEach((_, index) => {
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
      console.log("New expanded nodes:", Array.from(newSet)); // Debug log
      return newSet;
    });
  }, []);

  const updateProgress = useCallback((skillId: string, progress: number) => {
    setSkillProgress((prev) => ({
      ...prev,
      [skillId]: {
        ...prev[skillId],
        level: progress,
        status:
          progress === 100
            ? "mastered"
            : progress > 0
            ? "in-progress"
            : "available",
        lastAccessed: new Date(),
      },
    }));
  }, []);

  useEffect(() => {
    generateNodesAndEdges();
  }, [generateNodesAndEdges]);

  // Initialize progress for all skills
  useEffect(() => {
    const initialProgress: SkillProgress = {};

    programData.forEach((ue, ueIndex) => {
      const categoryId = `category-${ueIndex}`;
      initialProgress[categoryId] = {
        level: Math.floor(Math.random() * 30), // Random initial progress for demo
        status: "available",
        timeSpent: 0,
        lastAccessed: null,
      };

      ue.subcategories.forEach((subcategory, subIndex) => {
        const subcategoryId = `${categoryId}-sub-${subIndex}`;
        initialProgress[subcategoryId] = {
          level: Math.floor(Math.random() * 50),
          status: "available",
          timeSpent: 0,
          lastAccessed: null,
        };

        subcategory.topics.forEach((topic, topicIndex) => {
          const topicId = `${subcategoryId}-topic-${topicIndex}`;
          initialProgress[topicId] = {
            level: Math.floor(Math.random() * 80),
            status: "available",
            timeSpent: 0,
            lastAccessed: null,
          };
        });
      });
    });

    setSkillProgress(initialProgress);
  }, []);

  const proOptions = {
    hideAttribution: true,
  };

  return (
    <ProgressProvider value={{ skillProgress, updateProgress }}>
      <div className="h-screen w-full relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <AnimatedBackground />

        {/* Transparent Navbar */}
        <nav className="absolute top-0 left-0 right-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🧠</div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                AdmissAI
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Optional navigation items can be added here */}
            </div>
          </div>
        </nav>

        <FloatingStats />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: false,
          }}
          proOptions={proOptions}
          className="react-flow-dark-theme"
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
          preventScrolling={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            className="opacity-30"
          />
          <Controls
            className="!bg-white/10 !backdrop-blur-md !border-white/20"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-white/10 !backdrop-blur-md !border-white/20"
            nodeColor="#8b5cf6"
            maskColor="rgba(0, 0, 0, 0.5)"
          />
        </ReactFlow>
      </div>
    </ProgressProvider>
  );
}
