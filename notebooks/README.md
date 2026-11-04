# CA2i Research Launchpad

Notebooks for the **AI2Practice Research Lab**: six hands-on data science labs for clinical AI research, from your first line of Python to a project of your own. Each lab starts with a clinical question. Course pages: [AI2Practice Research Lab](https://um-ihc-ca2i.github.io/ai2practice/pages/research-lab.html).

## The labs

| # | Notebook | Clinical question | Time |
|---|---|---|---|
| 1 | `lesson-notebooks/Lab_1_Python_Colab_GitHub.ipynb` | How many CT scans were done last month, and of which body regions? | 1.5 h |
| 2 | `lesson-notebooks/Lab_2_Clinical_Data.ipynb` | Are patients sent for CT older than those sent for MRI? | 2 h |
| 3 | `lesson-notebooks/Lab_3_Evaluating_an_AI_Tool.ipynb` | A pneumothorax detector claims 94% sensitivity. What does it get on local data, and is it equal at both sites? | 2 h |
| Extra | `lesson-notebooks/Extra_Clinical_Evaluation.ipynb` | Which numbers should a department look at before trusting an AI tool? (Metrics Reloaded) | 45-60 min |
| 4 | `lesson-notebooks/Lab_4_Imaging_AI.ipynb` | Can a model tell pneumonia from normal on a chest X-ray, and what is it looking at? | 2 h |
| 5 | `lesson-notebooks/Lab_5_Reports_and_LLMs.ipynb` | How often do reports mention an incidental lung nodule, and can a large language model find them reliably? | 1.5 h |
| 6 | `lesson-notebooks/Lab_6_Your_Project.ipynb` | Your own question, written up as a structured abstract (optional) | 4-6 h |

`lesson-notebooks/rl_data.py` makes your personal practice data (the same every time for your GitHub username, different from everyone else's). `lesson-notebooks/toolkit.py` is your own toolkit: you add functions to it lab by lab and reuse them later. Lab 4 uses the open [MedMNIST](https://medmnist.com/) PneumoniaMNIST dataset, downloaded inside the notebook. All other data is synthetic and made for teaching.

## Getting started

1. **Fork** this repository (the "Fork" button at the top right). Your fork is where your work is saved.
2. Open a lab from its page on the AI2Practice site with the **Open in Colab** button, or go to [colab.research.google.com](https://colab.research.google.com), choose **File > Open notebook > GitHub**, paste the address of your fork and pick the notebook.
3. In the first code cell, set `GITHUB_USERNAME` to your GitHub username. That username generates your personal data.
4. Work through the notebook. Each task is tagged with how you'll work: Write, Fill in, Reuse, Direct the AI, Fix or Read. Test cells tell you when a task is right.

## Saving your work

In Colab, choose **File > Save a copy in GitHub**, pick your fork, keep the same file path and add a short message such as `Finished Lab 1`. Every save is kept as a version, so your fork becomes a record of your work and a portfolio.

At the end of each lab, the notebook prints two or three numbers. Enter them on the lab's page on the AI2Practice site to mark the lab finished.

## Using AI assistants

Some tasks ask you to have an AI assistant write the code (Colab's built-in assistant works; any is fine). Paste the code, run the test cell, and fill in the AI-use log cell under the task: what you asked, what you changed and whether the test passed. Checking AI-written code is the skill these tasks teach.

## Older material

The earlier `Research_Module_1-3` notebooks and their data are in `old/`.
