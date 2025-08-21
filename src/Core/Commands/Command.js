/**
 * @abstract
 * Abstract base class for a Command pattern implementation.
 *
 * Subclasses must implement the `execute()` method to perform
 * the associated action.
 *
 * @summary
 * Abstract command interface; to be extended by concrete commands.
 *
 * @example
 * class LogCommand extends Command {
 *   execute() {
 *     console.log("Executing command logic!");
 *   }
 * }
 *
 * const cmd = new LogCommand();
 * cmd.execute(); // Logs: Executing command logic!
 */
export class Command {
    /**
     * @abstract
     * Executes the command. Must be implemented by subclasses.
     * @throws {Error} Always throws unless implemented by subclass.
     */
    execute() {
        throw new Error('Command.execute() must be implemented');
    }
}
