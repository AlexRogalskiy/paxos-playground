# Paxos Playground

Paxos Playground is a simulation of a replicated state machine, implemented using the Paxos algorithm, written in Javascript. 
The UI is heavily based on [Raft Scope](https://github.com/ongardie/raftscope) created by [Diego Ongaro](https://github.com/ongardie) 
to visualize and explain [Raft](https://www.usenix.org/system/files/conference/atc14/atc14-paper-ongaro.pdf).

This is what it looks like:

![Paxos Playground screenshot](https://jivimberg.github.io/paxos-playground/img/PaxosPlaygroundScreenshot.png)

To foster understanding the system is presented in multiple configurations going from a bare-bones implementation of a 
replicated state machine using Paxos to a more rich and optimized implementation of the same system. Each new configuration
is based on the previous one and only adds a particular feature or optimization.

The available configurations are:
* [Basic configuration](https://jivimberg.github.io/paxos-playground/src/main/html/)
* [Sync Strategy](https://jivimberg.github.io/paxos-playground/src/main/html/?config=sync)
* [Master Strategy](https://jivimberg.github.io/paxos-playground/src/main/html/?config=master)
* [Master Optimized Strategy](https://jivimberg.github.io/paxos-playground/src/main/html/?config=master-optimized)
* [Master Optimized + Config changes Strategy](https://jivimberg.github.io/paxos-playground/src/main/html/?config=master-optimized-config)