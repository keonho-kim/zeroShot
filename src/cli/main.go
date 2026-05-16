package main

import (
	"fmt"
	"os"
)

func main() {
	if err := newRootCommand().Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "[zeroshot-cli] %s\n", err)
		os.Exit(1)
	}
}
