// Copyright 2011 David Galles, University of San Francisco. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification, are
// permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of
// conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list
// of conditions and the following disclaimer in the documentation and/or other materials
// provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY David Galles ``AS IS'' AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
// NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation are those of the
// authors and should not be interpreted as representing official policies, either expressed
// or implied, of the University of San Francisco

import Algorithm, {
	addControlToAlgorithmBar,
	addDivisorToAlgorithmBar,
	addLabelToAlgorithmBar,
} from './Algorithm.js';
import { act } from '../anim/AnimationMain';

const ARRAY_START_X = 100;
const ARRAY_START_Y = 30;

const MAX_LENGTH = 22;

const PATTERN_START_Y = 100;

const LAST_TABLE_START_Y = 200;

const COMP_COUNT_X = 575;
const COMP_COUNT_Y = 30;

export default class BoyerMoore extends Algorithm {
	constructor(am, w, h) {
		super(am, w, h);
		this.addControls();
		this.nextIndex = 0;
		this.setup();
	}

	addControls() {
		this.controls = [];

		addLabelToAlgorithmBar('Text');

		// Text text field
		this.textField = addControlToAlgorithmBar('Text', '');
		this.textField.onkeydown = this.returnSubmit(
			this.textField,
			this.findCallback.bind(this),
			MAX_LENGTH,
			false,
		);
		this.controls.push(this.textField);

		addLabelToAlgorithmBar('Pattern');

		// Pattern text field
		this.patternField = addControlToAlgorithmBar('Text', '');
		this.patternField.onkeydown = this.returnSubmit(
			this.patternField,
			this.findCallback.bind(this),
			MAX_LENGTH,
			false,
		);
		this.controls.push(this.patternField);

		// Find button
		this.findButton = addControlToAlgorithmBar('Button', 'Find');
		this.findButton.onclick = this.findCallback.bind(this);
		this.controls.push(this.findButton);

		addLabelToAlgorithmBar('or');

		// Build Last Occurrence Table button
		this.blotButton = addControlToAlgorithmBar('Button', 'Build Last Occurrence Table');
		this.blotButton.onclick = this.buildLastOccurrenceTableCallback.bind(this);
		this.controls.push(this.blotButton);

		addDivisorToAlgorithmBar();

		// Clear button
		this.clearButton = addControlToAlgorithmBar('Button', 'Clear');
		this.clearButton.onclick = this.clearCallback.bind(this);
		this.controls.push(this.clearButton);
	}

	setup() {
		this.commands = [];
		this.textRowID = [];
		this.comparisonMatrixID = [];
		this.patternTableLabelID = this.nextIndex++;
		this.patternTableCharacterID = [];
		this.patternTableIndexID = [];
		this.lastTableLabelID = this.nextIndex++;
		this.lastTableCharacterID = [];
		this.lastTableValueID = [];

		this.comparisonCountID = this.nextIndex++;

		this.compCount = 0;
		this.cmd(act.createLabel, this.comparisonCountID, '', COMP_COUNT_X, COMP_COUNT_Y, 0);

		this.animationManager.startNewAnimation(this.commands);
		this.animationManager.skipForward();
		this.animationManager.clearHistory();
	}

	reset() {
		this.nextIndex = 0;
		this.textRowID = [];
		this.comparisonMatrixID = [];
		this.patternTableLabelID = this.nextIndex++;
		this.patternTableCharacterID = [];
		this.patternTableIndexID = [];
		this.lastTableLabelID = this.nextIndex++;
		this.lastTableCharacterID = [];
		this.lastTableValueID = [];
		this.comparisonCountID = this.nextIndex++;
		this.compCount = 0;
	}

	findCallback() {
		if (
			this.textField.value !== '' &&
			this.patternField.value !== '' &&
			this.textField.value.length >= this.patternField.value.length
		) {
			this.implementAction(this.clear.bind(this));
			const text = this.textField.value;
			const pattern = this.patternField.value;
			this.textField.value = '';
			this.patternField.value = '';
			this.implementAction(this.find.bind(this), text, pattern);
		}
	}

	buildLastOccurrenceTableCallback() {
		if (this.patternField.value !== '') {
			this.implementAction(this.clear.bind(this));
			const pattern = this.patternField.value;
			this.patternField.value = '';
			this.implementAction(this.onlyBuildLastOccurrenceTable.bind(this), 0, pattern);
		}
	}

	clearCallback() {
		this.implementAction(this.clear.bind(this));
	}

	find(text, pattern) {
		this.commands = [];

		const maxRows = this.getMaxRows(text, pattern);
		if (maxRows <= 14) {
			this.cellSize = 30;
		} else if (maxRows <= 17) {
			this.cellSize = 25;
		} else {
			this.cellSize = 20;
		}

		this.textRowID = new Array(text.length);
		this.comparisonMatrixID = new Array(maxRows);
		for (let i = 0; i < maxRows; i++) {
			this.comparisonMatrixID[i] = new Array(text.length);
		}

		for (let i = 0; i < text.length; i++) {
			const xpos = i * this.cellSize + ARRAY_START_X;
			const ypos = ARRAY_START_Y;
			this.textRowID[i] = this.nextIndex;
			this.cmd(
				act.createRectangle,
				this.nextIndex,
				text.charAt(i),
				this.cellSize,
				this.cellSize,
				xpos,
				ypos,
			);
			this.cmd(act.setBackgroundColor, this.nextIndex++, '#D3D3D3');
		}

		let xpos;
		let ypos;
		for (let row = 0; row < maxRows; row++) {
			for (let col = 0; col < text.length; col++) {
				xpos = col * this.cellSize + ARRAY_START_X;
				ypos = (row + 1) * this.cellSize + ARRAY_START_Y;
				this.comparisonMatrixID[row][col] = this.nextIndex;
				this.cmd(
					act.createRectangle,
					this.nextIndex++,
					'',
					this.cellSize,
					this.cellSize,
					xpos,
					ypos,
				);
			}
		}

		const lastTable = this.buildLastTable(text.length, pattern);

		const iPointerID = this.nextIndex++;
		const jPointerID = this.nextIndex++;
		this.cmd(
			act.createHighlightCircle,
			iPointerID,
			'#0000FF',
			ARRAY_START_X + (pattern.length - 1) * this.cellSize,
			ARRAY_START_Y,
			this.cellSize / 2,
		);
		this.cmd(
			act.createHighlightCircle,
			jPointerID,
			'#0000FF',
			ARRAY_START_X + (pattern.length - 1) * this.cellSize,
			ARRAY_START_Y + this.cellSize,
			this.cellSize / 2,
		);

		let i = 0;
		let j = pattern.length - 1;
		let row = 0;
		while (i <= text.length - pattern.length) {
			for (let k = i; k < i + pattern.length; k++) {
				this.cmd(
					act.setText,
					this.comparisonMatrixID[row][k],
					pattern.charAt(k - i),
					xpos,
					ypos,
				);
			}
			this.cmd(act.step);
			while (j >= 0 && pattern.charAt(j) === text.charAt(i + j)) {
				this.cmd(
					act.setText,
					this.comparisonCountID,
					'Comparison Count: ' + ++this.compCount,
				);
				this.cmd(act.setBackgroundColor, this.comparisonMatrixID[row][i + j], '#2ECC71');
				j--;
				this.cmd(act.step);
				if (j >= 0) {
					const xpos = (i + j) * this.cellSize + ARRAY_START_X;
					this.cmd(act.move, iPointerID, xpos, ARRAY_START_Y);
					const ypos = (row + 1) * this.cellSize + ARRAY_START_Y;
					this.cmd(act.move, jPointerID, xpos, ypos);
					this.cmd(act.step);
				}
			}
			if (j === -1) {
				i++;
			} else {
				this.cmd(
					act.setText,
					this.comparisonCountID,
					'Comparison Count: ' + ++this.compCount,
				);
				this.cmd(act.setBackgroundColor, this.comparisonMatrixID[row][i + j], '#E74C3C');
				let shift;
				if (text.charAt(i + j) in lastTable) {
					shift = lastTable[text.charAt(i + j)];
				} else {
					shift = -1;
				}
				if (shift < j) {
					i += j - shift;
				} else {
					i++;
				}
			}
			j = pattern.length - 1;
			row++;
			if (i <= text.length - pattern.length) {
				const xpos = (i + j) * this.cellSize + ARRAY_START_X;
				this.cmd(act.move, iPointerID, xpos, ARRAY_START_Y);
				const ypos = (row + 1) * this.cellSize + ARRAY_START_Y;
				this.cmd(act.move, jPointerID, xpos, ypos);
			}
		}

		this.cmd(act.delete, iPointerID);
		this.cmd(act.delete, jPointerID);
		return this.commands;
	}

	getMaxRows(text, pattern) {
		const lastTable = {};
		for (let i = 0; i < pattern.length; i++) {
			lastTable[pattern.charAt(i)] = i;
		}
		let i = 0;
		let j = pattern.length - 1;
		let maxRows = 0;
		while (i <= text.length - pattern.length) {
			while (j >= 0 && pattern.charAt(j) === text.charAt(i + j)) {
				j--;
			}
			if (j === -1) {
				i++;
			} else {
				let shift;
				if (text.charAt(i + j) in lastTable) {
					shift = lastTable[text.charAt(i + j)];
				} else {
					shift = -1;
				}
				if (shift < j) {
					i += j - shift;
				} else {
					i++;
				}
			}
			j = pattern.length - 1;
			maxRows++;
		}
		return maxRows;
	}

	onlyBuildLastOccurrenceTable(textLength, pattern) {
		this.commands = [];
		this.cellSize = 30;
		this.buildLastTable(textLength, pattern);
		return this.commands;
	}

	buildLastTable(textLength, pattern) {
		// Display labels
		const labelsX = ARRAY_START_X + textLength * this.cellSize + 10;
		this.cmd(
			act.createLabel,
			this.patternTableLabelID,
			'Pattern:',
			labelsX,
			PATTERN_START_Y - 5,
			0,
		);
		this.cmd(
			act.createLabel,
			this.lastTableLabelID,
			'Last occurence table:',
			labelsX,
			LAST_TABLE_START_Y + 10,
			0,
		);
		this.cmd(act.move, this.comparisonCountID, labelsX, COMP_COUNT_Y);
		this.cmd(act.setText, this.comparisonCountID, 'Comparison Count: ' + this.compCount);

		// Display pattern table
		const patternTableStartX = ARRAY_START_X + textLength * this.cellSize + 80;
		this.patternTableCharacterID = new Array(pattern.length);
		this.patternTableIndexID = new Array(pattern.length);
		for (let i = 0; i < pattern.length; i++) {
			const xpos = patternTableStartX + i * this.cellSize;
			this.patternTableCharacterID[i] = this.nextIndex;
			this.cmd(
				act.createRectangle,
				this.nextIndex++,
				pattern.charAt(i),
				this.cellSize,
				this.cellSize,
				xpos,
				PATTERN_START_Y,
			);
			this.patternTableIndexID[i] = this.nextIndex;
			this.cmd(act.createLabel, this.nextIndex++, i, xpos, PATTERN_START_Y + this.cellSize);
		}

		// Create and display last occurrence table
		const lastTable = {};
		const lotStartX = ARRAY_START_X + textLength * this.cellSize + 155;
		this.lastTableCharacterID = [];
		this.lastTableValueID = [];
		let j = 0;

		const lotPointerID = this.nextIndex++;
		this.cmd(
			act.createHighlightCircle,
			lotPointerID,
			'#0000FF',
			patternTableStartX,
			PATTERN_START_Y,
			this.cellSize / 2,
		);
		this.cmd(act.setHighlight, lotPointerID, 1);

		for (let i = 0; i < pattern.length; i++) {
			let xpos = patternTableStartX + i * this.cellSize;
			this.cmd(act.move, lotPointerID, xpos, PATTERN_START_Y);
			if (lastTable[pattern.charAt(i)]) {
				this.cmd(act.setText, lastTable[pattern.charAt(i)][1], i);
				this.cmd(act.setHighlight, lastTable[pattern.charAt(i)][1], 1);
				lastTable[pattern.charAt(i)][0] = i;
			} else {
				xpos = lotStartX + j * this.cellSize;
				this.lastTableCharacterID.push(this.nextIndex);
				this.cmd(
					act.createRectangle,
					this.nextIndex,
					pattern.charAt(i),
					this.cellSize,
					this.cellSize,
					xpos,
					LAST_TABLE_START_Y,
				);
				this.cmd(act.setBackgroundColor, this.nextIndex++, '#D3D3D3');
				this.lastTableValueID.push(this.nextIndex);
				this.cmd(
					act.createRectangle,
					this.nextIndex,
					i,
					this.cellSize,
					this.cellSize,
					xpos,
					LAST_TABLE_START_Y + this.cellSize,
				);
				this.cmd(act.setHighlight, this.nextIndex, 1);
				j++;
				lastTable[pattern.charAt(i)] = [i, this.nextIndex++];
			}
			this.cmd(act.step);
			this.cmd(act.setHighlight, lastTable[pattern.charAt(i)][1], 0);
		}

		// Display '*' entry
		this.cmd(act.delete, lotPointerID);
		const xpos = lotStartX + j * this.cellSize;
		this.lastTableCharacterID.push(this.nextIndex);
		this.cmd(
			act.createRectangle,
			this.nextIndex,
			'*',
			this.cellSize,
			this.cellSize,
			xpos,
			LAST_TABLE_START_Y,
		);
		this.cmd(act.setBackgroundColor, this.nextIndex++, '#D3D3D3');
		this.lastTableValueID.push(this.nextIndex);
		this.cmd(
			act.createRectangle,
			this.nextIndex++,
			'-1',
			this.cellSize,
			this.cellSize,
			xpos,
			LAST_TABLE_START_Y + this.cellSize,
		);
		this.cmd(act.step);

		Object.keys(lastTable).map(char => (lastTable[char] = lastTable[char][0])); // Return only indices
		return lastTable;
	}

	clear() {
		this.commands = [];
		for (let i = 0; i < this.textRowID.length; i++) {
			this.cmd(act.delete, this.textRowID[i]);
		}
		this.textRowID = [];
		for (let i = 0; i < this.comparisonMatrixID.length; i++) {
			for (let j = 0; j < this.comparisonMatrixID[i].length; j++) {
				this.cmd(act.delete, this.comparisonMatrixID[i][j]);
			}
		}
		this.comparisonMatrixID = [];
		if (this.patternTableCharacterID.length !== 0) {
			this.cmd(act.delete, this.patternTableLabelID);
		}
		for (let i = 0; i < this.patternTableCharacterID.length; i++) {
			this.cmd(act.delete, this.patternTableCharacterID[i]);
			this.cmd(act.delete, this.patternTableIndexID[i]);
		}
		this.patternTableCharacterID = [];
		this.patternTableIndexID = [];
		if (this.lastTableCharacterID.length !== 0) {
			this.cmd(act.delete, this.lastTableLabelID);
		}
		for (let i = 0; i < this.lastTableCharacterID.length; i++) {
			this.cmd(act.delete, this.lastTableCharacterID[i]);
			this.cmd(act.delete, this.lastTableValueID[i]);
		}
		this.compCount = 0;
		this.cmd(act.setText, this.comparisonCountID, '');
		this.lastTableCharacterID = [];
		this.lastTableValueID = [];
		return this.commands;
	}

	disableUI() {
		for (let i = 0; i < this.controls.length; i++) {
			this.controls[i].disabled = true;
		}
	}

	enableUI() {
		for (let i = 0; i < this.controls.length; i++) {
			this.controls[i].disabled = false;
		}
	}
}
