#include <sys/ptrace.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <sys/user.h>
#include <stdio.h>
#include <string.h>

#define PRINT_REG(reg) fprintf(output, "\"" #reg "\":%lld,", registers.reg)

unsigned long long main(int argc, char** argv)
{
    pid_t child = fork();
    if(child == 0)
	{
        ptrace(PTRACE_TRACEME, 0, NULL, NULL);
		execvp(argv[1], argv + 1);
    }
    else
	{
		int status;
		struct user_regs_struct registers;
		siginfo_t siginfo;

		FILE* output = fopen("/tmp/asm_trace.json", "w");
		fputc('{', output);

		waitpid(child, &status, 0);
		ptrace(PTRACE_CONT, child, NULL, NULL);
		waitpid(child, &status, 0);

		ptrace(PTRACE_GETREGS, child, NULL, &registers);

		PRINT_REG(rax); PRINT_REG(rbx);
		PRINT_REG(rcx); PRINT_REG(rdx);
		PRINT_REG(rsi); PRINT_REG(rdi);
		PRINT_REG(rsp); PRINT_REG(rbp);
		PRINT_REG(r8);  PRINT_REG(r9);
		PRINT_REG(r10); PRINT_REG(r11);
		PRINT_REG(r12); PRINT_REG(r13);
		PRINT_REG(r14); PRINT_REG(r15);
		PRINT_REG(rip); PRINT_REG(eflags);

		ptrace(PTRACE_GETSIGINFO, child, NULL, &siginfo);
		fprintf(output, "\"signal\":\"%s\",", siginfo.si_signo ? strsignal(siginfo.si_signo) : "");
		fprintf(output, "\"exitCode\":%d}", WEXITSTATUS(status));

		fclose(output);
    }
    return 0;
}