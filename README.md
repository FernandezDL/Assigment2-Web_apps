# Assigments - JavaScript Web Apps
### Vancouver Film School

## Description
_Crazy Mad Flying Animals_ is a physics-based 2D web game in which the player tries to win all the levels by throwing Crazy Mad Flying Animals to defeat all the enemies.

## Assigment 1
The goal of this assigment is to create a client-server application that allows the editing of levels for the game, allowing to create blocks, save, and load levels

In the editor the level designer can place 5 different block types:
- Block
- Enemies (Pigs)
- Catapult
- Dirt
- Rocks
  
## Assigment 2
Using the JSON files created by the level editor in the first assigment, the goal of this assigment is to draw all the shapes and handle the physics to have a functional game to play. To use the game you have to copy-paste the JSON files in the `levels` folder.

In the game the different figures represents the different elements:
- Bird: Red circle
- Pig: Green circle
- Block: Brown square
- Dirt: Caramel color square
- Rocks: Grey square
- Catapult: Vertical brown rectangle

To play, grab the bird, pull, and aim to hit the pigs. When all the pigs are killed the level will be completed. If you don't kill all the pigs with the 3 available birds, you'll lose the level and will have to start again

## Commands
### Level editor
Get a terminal in the root folder and run the following commands: 

- Install Cors & Express
`npm install cors express`

- Run project
`npm run dev` or `npm node server.js`

### Game
Get a terminal in the root folder of the game and run the following command:

- Run project
`npx http-server -c-1`

*You'll need Node.js

## Author
PG29 Diana
