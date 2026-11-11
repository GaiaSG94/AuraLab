---
name: labkit-teaching
description: Design the teaching intent of a virtual science lab - the hypothesis the student tests, the levers they turn, the measurements they read and the questions their notebook asks. Use when writing or reviewing the pedagogical side of a lab.
license: MIT
---

# Teaching intent of a lab

A lab is not a simulation with sliders. It is a loop: **hypothesis → action →
observation → understanding**. If the loop is missing, the lab is a toy and
the judge will see it as one.

## The four ingredients

1. **A phenomenon.** Something the student already has an intuition about and
   will be surprised by. "Gravity keeps the planets in orbit" is a phenomenon;
   "particles move" is not.
2. **A few levers.** Two or three sliders, each one changing one thing. A
   lab with twelve knobs hides the cause it is supposed to show.
3. **Measurements.** Numbers with units, live. The student must be able to
   *see* the effect of a lever, not infer it.
4. **Questions.** The notebook prompts (`notebook.prompts`) are the guide:
   propositions the student can answer with the measurements in front of them.

## Writing the notebook prompts

A good prompt is answerable from the screen and **not** answerable from
common sense alone:

- bad: "What happens when the population grows?"
- good: "Remove all foxes, wait, then bring them back: what happens?"

The second one forces an experiment with a before and an after. It also
implies the two knobs the student needs.

## The default state must tell a story

A lab opens on a state that already shows something: the rabbits are
reproducing faster than the foxes eat them, the star is pulling the belt
in, the flask is already half blue. The student arrives at a question
instead of at an empty screen.

## Check the loop before shipping

- Is there a phenomenon in one sentence?
- Does each lever change a measurement the student can read?
- Do the notebook prompts point at the levers?
- Does the default state show a deviation from the naive expectation?

If one answer is "no", the lab is not finished — whatever its code quality.
