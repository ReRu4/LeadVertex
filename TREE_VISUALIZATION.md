# Symbol-Code Tree Visualization

This project contains an SVG visualization that represents symbol-code pairs as a hierarchical binary tree structure.

## Overview

The visualization displays the following symbol-code pairs:

| Symbol | Code    |
|--------|---------|
| S6     | 000     |
| S3     | 001     |
| S2     | 011     |
| S10    | 010     |
| S8     | 100     |
| S7     | 101     |
| S5     | 1100    |
| S11    | 1110    |
| S12    | 1100    |
| S1     | 111110  |
| S9     | 11110   |
| S4     | 111111  |

## Features

- **Interactive SVG Tree**: The visualization shows a binary tree where each node represents a decision point in the binary encoding
- **Symbol Nodes**: Green circles represent the actual symbols (S1, S2, etc.)
- **Edge Labels**: Binary digits (0 and 1) label each edge to show the path to each symbol
- **Duplicate Code Handling**: S5 and S12 both have the same code (1100), which is highlighted in red
- **Responsive Design**: The visualization scales properly on different screen sizes

## Files

- `symbol_tree_visualization.html` - The main HTML file containing the SVG visualization and styling

## How to View

1. Open `symbol_tree_visualization.html` in any modern web browser
2. The tree visualization will display showing the hierarchical structure of the binary codes
3. Follow the paths from the root node to see how each symbol's code is constructed

## Tree Structure

The tree follows these principles:
- **Root**: Starting point for all codes
- **Left Edge (0)**: Represents a '0' bit in the code
- **Right Edge (1)**: Represents a '1' bit in the code
- **Path**: The complete path from root to a symbol gives the binary code

## Technical Details

- Built using pure HTML5 and SVG
- No external dependencies required
- Responsive CSS styling
- Clear visual distinction between internal nodes and symbol nodes
- Proper edge labeling for easy code reading

## Usage

This visualization can be used for:
- Understanding binary tree encoding schemes
- Educational purposes for computer science concepts
- Visualizing Huffman coding or similar prefix-free codes
- Debugging encoding/decoding algorithms