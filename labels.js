export var labels = new Map();

export function Label(name, index)
{
    this.length = 0;
    this.newlines = 0;
    labels.set(name, index);
}